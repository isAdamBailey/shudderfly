<script setup>
import BreezeLabel from '@/Components/Label.vue';
import {useForm} from '@inertiajs/inertia-vue3';
import Button from "@/Components/Button";
import {ref} from "vue";
import Wysiwyg from "@/Components/Wysiwyg";
import VideoIcon from "@/Components/svg/VideoIcon";

const emit = defineEmits(['close-form'])

const props = defineProps({
  book: Object
})

const form = useForm({
  book_id: props.book.id,
  content: '',
  image: null,
});

const imagePreview = ref("")

const imageInput = ref(null)

function selectNewImage() {
  imageInput.value.click();
}

function updateImagePreview() {
  const photo = imageInput.value.files[0];
  if (!photo) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.value = e.target.result;
  };

  reader.readAsDataURL(photo);
}

function clearImageFileInput() {
  if (imageInput.value) {
    imageInput.value = null;
  }
}

const submit = () => {
  if (imageInput.value) {
    form.image = imageInput.value.files[0];
  }
  form.post(route('pages.store'), {
    onSuccess: () => {
      clearImageFileInput();
      form.reset();
      emit('close-form')
    },
  });
};
</script>

<template>
  <div class="bg-white rounded mb-5 md:mb-0 md:mr-5 p-5 md:w-3/4">
    <h3 class="text-2xl w-full border-b mb-7">Add a New Page</h3>
    <form @submit.prevent="submit">
      <div class="flex flex-wrap">
        <div class="w-full md:w-1/4">
          <BreezeLabel for="imageInput" value="Media"/>
          <input
              ref="imageInput"
              type="file"
              class="hidden"
              @change="updateImagePreview"
          />
          <div v-if="imagePreview.startsWith('data:image')"
               class="h-40 w-40 rounded bg-cover bg-center bg-no-repeat"
               :style="'background-image: url(\'' + imagePreview + '\');'"
          >
          </div>
          <div class="w-3/4" v-else-if="imagePreview.startsWith('data:video')">
            <VideoIcon class="text-blue-500" />
          </div>

          <Button
              class="mt-2 mr-2"
              type="button"
              @click.prevent="selectNewImage"
          >
            Select Media to Upload
          </Button>
        </div>

        <div class="w-full md:w-3/4">
          <BreezeLabel for="content" value="Words"/>
          <Wysiwyg v-model="form.content" id="content" class="mt-1 block w-full"/>
        </div>
      </div>

      <div class="flex justify-center mt-5 md:mt-20">
        <Button class="w-3/4 flex justify-center py-3" :class="{ 'opacity-25': form.processing }"
                :disabled="form.processing">
          Create!
        </Button>
      </div>
    </form>
  </div>
</template>
