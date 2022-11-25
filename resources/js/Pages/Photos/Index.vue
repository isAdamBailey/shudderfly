<template>
  <Head title="Photos"/>

  <BreezeAuthenticatedLayout>
    <template #header>
      <div class="flex justify-between">
        <Link class="w-3/4" :href="route('pictures.index')">
          <h2 class="font-semibold text-3xl text-gray-900 leading-tight">
            {{ photos.per_page }} {{ isRandom ? 'Random' : 'Most Recent' }} Photos
          </h2>
        </Link>
        <Link :href="randomButtonDisabled ? route('pictures.index', {filter: 'random'}) : null">
          <Button @click="randomButtonDisabled=true" :disabled="randomButtonDisabled">
            <RoundArrowsIcon/>
          </Button>
        </Link>
      </div>
    </template>

    <PhotosGrid :photos="photos.data"/>
  </BreezeAuthenticatedLayout>
</template>

<script setup>
import BreezeAuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import PhotosGrid from '@/Pages/Photos/PhotosGrid.vue';
import {Head, Link} from '@inertiajs/inertia-vue3';
import RoundArrowsIcon from '@/Components/svg/RoundArrowsIcon.vue';
import Button from "@/Components/Button.vue";
import {ref, computed} from 'vue';

defineProps({
  photos: Object,
});

const isRandom = computed(() => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('filter') === 'random';
});

const randomButtonDisabled = ref(false);
</script>
