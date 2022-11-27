<template>
    <div class="w-full bg-white px-4 bg-yellow-300 dark:bg-gray-800">
        <label for="search" class="hidden">Search</label>
        <input
            id="search"
            ref="search"
            v-model="search"
            class="h-10 w-full cursor-pointer rounded-full border border-blue-500 bg-gray-100 px-4 pb-0 pt-px text-gray-700 outline-none transition focus:border-blue-400"
            :class="{ 'transition-border': search }"
            autocomplete="off"
            name="search"
            placeholder="Search books!"
            type="search"
            @keyup.esc="search = null"
        />
    </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
    props: {
        routeName: String,
    },

    data() {
        return {
            search: this.$inertia.page.props.books.search || null,
        };
    },

    watch: {
        search() {
            if (this.search) {
                this.searchMethod();
            } else {
                this.$inertia.get(route(this.routeName));
            }
        },
    },

    methods: {
        searchMethod: _.debounce(function () {
            this.$inertia.get(
                route(this.routeName),
                { search: this.search },
                { preserveState: true }
            );
        }, 500),
    },
});
</script>
