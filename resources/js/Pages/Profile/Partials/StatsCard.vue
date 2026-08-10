<template>
    <div class="text-gray-900 dark:text-white">
        <div
            v-if="statsData.generatedAt"
            class="text-xs text-gray-500 dark:text-gray-400 mb-3"
        >
            Updated {{ statsData.generatedAt }} &middot;
            {{ countAddS(statsData.booksAddedToday || 0, "book") }},
            {{ countAddS(statsData.pagesAddedToday || 0, "page") }},
            {{ countAddS(statsData.songsAddedToday || 0, "song") }},
            {{ countAddS(statsData.soundsAddedToday || 0, "sound") }} added
            today
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <!-- Books -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <!-- make icon + title link to books index -->
                <Link
                    class="flex items-center"
                    :href="route('books.index')"
                    aria-label="View all books"
                >
                    <i class="ri-book-line text-2xl text-gray-400 mr-3"></i>
                    <div>
                        <div class="text-base text-gray-500">Books</div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfBooks?.toLocaleString?.() ?? 0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <SpeakButton
                        :disabled="speaking"
                        class="mr-2"
                        icon-class="ri-speak-fill text-lg"
                        aria-label="Speak books"
                        @click="speakStat('all_books', statsData.numberOfBooks)"
                    />
                </div>
            </div>

            <!-- Pages -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <Link
                    class="flex items-center"
                    :href="route('pictures.index')"
                    aria-label="View uploads"
                >
                    <i
                        class="ri-file-text-line text-2xl text-gray-400 mr-3"
                    ></i>
                    <div>
                        <div class="text-base text-gray-500">Pages</div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfPages?.toLocaleString?.() ?? 0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <SpeakButton
                        :disabled="speaking"
                        class="mr-2"
                        icon-class="ri-speak-fill text-lg"
                        aria-label="Speak total number of pages"
                        @click="speakStat('all_pages', statsData.numberOfPages)"
                    />
                </div>
            </div>

            <!-- Songs -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <Link
                    class="flex items-center"
                    :href="route('pictures.index', { filter: 'music' })"
                    aria-label="View music uploads"
                >
                    <i class="ri-music-2-line text-2xl text-gray-400 mr-3"></i>
                    <div>
                        <div class="text-base text-gray-500">Songs</div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfSongs?.toLocaleString?.() ?? 0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <SpeakButton
                        :disabled="speaking"
                        class="mr-2"
                        icon-class="ri-speak-fill text-lg"
                        aria-label="Speak songs"
                        @click="speakStat('songs', statsData.numberOfSongs)"
                    />
                </div>
            </div>

            <!-- Sounds -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <Link
                    class="flex items-center"
                    :href="route('sounds.index')"
                    aria-label="View sounds"
                >
                    <i
                        class="ri-volume-up-line text-2xl text-gray-400 mr-3"
                    ></i>
                    <div>
                        <div class="text-base text-gray-500">Sounds</div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfSounds?.toLocaleString?.() ??
                                0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <SpeakButton
                        :disabled="speaking"
                        class="mr-2"
                        icon-class="ri-speak-fill text-lg"
                        aria-label="Speak sounds"
                        @click="speakStat('sounds', statsData.numberOfSounds)"
                    />
                </div>
            </div>

            <!-- Images (pages that are images) -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <Link
                    class="flex items-center"
                    :href="route('pictures.index')"
                    aria-label="View image pages"
                >
                    <i class="ri-image-line text-2xl text-gray-400 mr-3"></i>
                    <div>
                        <div class="text-base text-gray-500">Images</div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfImages?.toLocaleString?.() ??
                                0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <SpeakButton
                        :disabled="speaking"
                        class="mr-2"
                        icon-class="ri-speak-fill text-lg"
                        aria-label="Speak images"
                        @click="speakStat('images', statsData.numberOfImages)"
                    />
                </div>
            </div>

            <!-- Videos -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <!-- make icon + title link to popular uploads (pictures.index?filter=popular) -->
                <Link
                    class="flex items-center"
                    :href="route('pictures.index')"
                    aria-label="View videos"
                >
                    <i class="ri-video-line text-2xl text-gray-400 mr-3"></i>
                    <div>
                        <div class="text-base text-gray-500">Videos</div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfVideos?.toLocaleString?.() ??
                                0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <SpeakButton
                        :disabled="speaking"
                        class="mr-2"
                        icon-class="ri-speak-fill text-lg"
                        aria-label="Speak videos"
                        @click="speakStat('videos', statsData.numberOfVideos)"
                    />
                </div>
            </div>

            <!-- YouTube videos -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <!-- make icon + title link to youtube filter -->
                <Link
                    class="flex items-center"
                    :href="route('pictures.index', { filter: 'youtube' })"
                    aria-label="View YouTube videos"
                >
                    <i class="ri-youtube-line text-2xl text-gray-400 mr-3"></i>
                    <div>
                        <div class="text-base text-gray-500">
                            YouTube videos
                        </div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfYouTubeVideos?.toLocaleString?.() ??
                                0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <SpeakButton
                        :disabled="speaking"
                        class="mr-2"
                        icon-class="ri-speak-fill text-lg"
                        aria-label="Speak YouTube videos"
                        @click="
                            speakStat(
                                'youtube_videos',
                                statsData.numberOfYouTubeVideos
                            )
                        "
                    />
                </div>
            </div>

            <!-- Screenshots -->
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
                <!-- make icon + title link to snapshots -->
                <Link
                    class="flex items-center"
                    :href="route('pictures.index', { filter: 'snapshot' })"
                    aria-label="View screenshots"
                >
                    <i class="ri-camera-line text-2xl text-gray-400 mr-3"></i>
                    <div>
                        <div class="text-base text-gray-500">Screenshots</div>
                        <div class="font-bold text-2xl">
                            {{
                                statsData.numberOfScreenshots?.toLocaleString?.() ??
                                0
                            }}
                        </div>
                    </div>
                </Link>
                <div class="flex items-center">
                    <SpeakButton
                        :disabled="speaking"
                        class="mr-2"
                        icon-class="ri-speak-fill text-lg"
                        aria-label="Speak screenshots"
                        @click="
                            speakStat(
                                'screenshots',
                                statsData.numberOfScreenshots
                            )
                        "
                    />
                </div>
            </div>
        </div>

        <!-- Most / Least pages -->
        <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
            >
                <div class="flex items-start">
                    <div class="flex-shrink-0 mr-3">
                        <img
                            v-if="statsData.mostPages?.cover_image?.media_path"
                            :src="statsData.mostPages.cover_image.media_path"
                            :alt="statsData.mostPages?.title"
                            class="w-16 h-16 rounded-lg object-cover"
                            @error="(e) => (e.target.style.display = 'none')"
                        />
                        <div
                            v-else
                            class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"
                        >
                            <i
                                class="ri-book-line text-xl text-gray-400 dark:text-gray-500"
                            ></i>
                        </div>
                    </div>

                    <div class="flex-1">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="text-sm text-gray-500">
                                    Book with most pages
                                </div>
                                <Link
                                    v-if="statsData.mostPages?.slug"
                                    class="font-bold hover:text-blue-400 truncate block"
                                    :href="
                                        route(
                                            'books.show',
                                            statsData.mostPages?.slug
                                        )
                                    "
                                    :title="statsData.mostPages?.title"
                                >
                                    {{ statsData.mostPages?.title }}
                                </Link>
                                <span
                                    v-else
                                    class="font-bold truncate block"
                                    :title="statsData.mostPages?.title"
                                >
                                    {{ statsData.mostPages?.title }}
                                </span>
                                <div class="text-sm text-gray-500 mt-1">
                                    {{
                                        countAddS(
                                            statsData.mostPages?.pages_count ||
                                                0,
                                            "page"
                                        )
                                    }}
                                </div>
                            </div>

                            <div class="ml-4">
                                <SpeakButton
                                    :disabled="speaking"
                                    icon-class="ri-speak-fill text-lg"
                                    aria-label="Speak book with most pages"
                                    @click="
                                        speakBookPageStat(
                                            'book_most_pages',
                                            statsData.mostPages
                                        )
                                    "
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
            >
                <div class="flex items-start">
                    <div class="flex-shrink-0 mr-3">
                        <img
                            v-if="statsData.leastPages?.cover_image?.media_path"
                            :src="statsData.leastPages.cover_image.media_path"
                            :alt="statsData.leastPages?.title"
                            class="w-16 h-16 rounded-lg object-cover"
                            @error="(e) => (e.target.style.display = 'none')"
                        />
                        <div
                            v-else
                            class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"
                        >
                            <i
                                class="ri-book-line text-xl text-gray-400 dark:text-gray-500"
                            ></i>
                        </div>
                    </div>

                    <div class="flex-1">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="text-sm text-gray-500">
                                    Book with least pages
                                </div>
                                <Link
                                    v-if="statsData.leastPages?.slug"
                                    class="font-bold hover:text-blue-400 truncate block"
                                    :href="
                                        route(
                                            'books.show',
                                            statsData.leastPages?.slug
                                        )
                                    "
                                    :title="statsData.leastPages?.title"
                                >
                                    {{ statsData.leastPages?.title }}
                                </Link>
                                <span
                                    v-else
                                    class="font-bold truncate block"
                                    :title="statsData.leastPages?.title"
                                >
                                    {{ statsData.leastPages?.title }}
                                </span>
                                <div class="text-sm text-gray-500 mt-1">
                                    {{
                                        countAddS(
                                            statsData.leastPages?.pages_count ||
                                                0,
                                            "page"
                                        )
                                    }}
                                </div>
                            </div>

                            <div class="ml-4">
                                <SpeakButton
                                    :disabled="speaking"
                                    icon-class="ri-speak-fill text-lg"
                                    aria-label="Speak book with least pages"
                                    @click="
                                        speakBookPageStat(
                                            'book_least_pages',
                                            statsData.leastPages
                                        )
                                    "
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Top lists -->
        <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
            >
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center">
                        <SpeakButton
                            class="mr-3"
                            :disabled="speaking"
                            icon-class="ri-speak-fill text-lg"
                            aria-label="Speak top 5 books"
                            @click="speakTopBooks"
                        />
                        <p class="font-bold text-lg">
                            Top 5 Most Popular Books
                        </p>
                    </div>

                    <Link
                        class="text-sm font-medium text-blue-500 hover:underline"
                        :href="
                            route('categories.show', {
                                categoryName: 'popular',
                            })
                        "
                        >View all</Link
                    >
                </div>

                <div class="space-y-2">
                    <div
                        v-for="(book, index) in statsData.mostReadBooks || []"
                        :key="book.id"
                        class="flex items-center"
                    >
                        <span class="text-gray-500 dark:text-gray-400 mr-2"
                            >{{ index + 1 }}.</span
                        >
                        <Link
                            v-if="book?.slug"
                            class="flex items-center font-medium hover:text-blue-400 truncate"
                            :href="route('books.show', { book: book?.slug })"
                            :aria-label="`View book ${book.title}`"
                            :title="book.title"
                        >
                            <div class="flex-shrink-0 mr-3">
                                <img
                                    v-if="book.cover_image?.media_path"
                                    :src="book.cover_image.media_path"
                                    :alt="book.title"
                                    class="w-10 h-10 rounded-lg object-cover"
                                    @error="
                                        (e) => (e.target.style.display = 'none')
                                    "
                                />
                            </div>

                            <span class="truncate" style="max-width: 100%">{{
                                book.title
                            }}</span>
                        </Link>
                        <div
                            v-else
                            class="flex items-center font-medium truncate"
                            :title="book.title"
                        >
                            <div class="flex-shrink-0 mr-3">
                                <img
                                    v-if="book.cover_image?.media_path"
                                    :src="book.cover_image.media_path"
                                    :alt="book.title"
                                    class="w-10 h-10 rounded-lg object-cover"
                                    @error="
                                        (e) => (e.target.style.display = 'none')
                                    "
                                />
                            </div>

                            <span class="truncate" style="max-width: 100%">{{
                                book.title
                            }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div
                class="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
            >
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center">
                        <SpeakButton
                            class="mr-3"
                            :disabled="speaking"
                            icon-class="ri-speak-fill text-lg"
                            aria-label="Speak top 5 songs"
                            @click="speakTopSongs"
                        />
                        <p class="font-bold text-lg">
                            Top 5 Most Popular Songs
                        </p>
                    </div>

                    <button
                        type="button"
                        class="text-sm font-medium text-blue-500 hover:underline"
                        @click="openPopularSongs"
                    >
                        View all
                    </button>
                </div>

                <div class="space-y-2">
                    <div
                        v-for="(song, index) in statsData.mostReadSongs || []"
                        :key="song.id"
                        class="flex items-center"
                    >
                        <span class="text-gray-500 dark:text-gray-400 mr-2"
                            >{{ index + 1 }}.</span
                        >
                        <button
                            type="button"
                            class="flex items-center font-medium hover:text-blue-400 truncate cursor-pointer"
                            :aria-label="`Play song ${song.title}`"
                            :title="song.title"
                            @click="
                                playSong(song);
                                openFlyout();
                            "
                        >
                            <div class="flex-shrink-0 mr-3">
                                <img
                                    v-if="song.thumbnail_default"
                                    :src="song.thumbnail_default"
                                    :alt="song.title"
                                    class="w-10 h-10 rounded-lg object-cover"
                                    @error="
                                        (e) => (e.target.style.display = 'none')
                                    "
                                />
                            </div>

                            <span class="truncate" style="max-width: 100%">{{
                                song.title
                            }}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Engagement -->
        <div
            v-if="hasEngagementStats"
            class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
            <div
                v-if="statsData.mostReactedMessage"
                class="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
            >
                <div class="flex items-start justify-between">
                    <div class="min-w-0">
                        <div class="text-sm text-gray-500">
                            Most reacted message
                        </div>
                        <div class="font-medium truncate mt-1">
                            "{{ statsData.mostReactedMessage.text }}"
                        </div>
                    </div>
                    <div class="ml-4">
                        <SpeakButton
                            :disabled="speaking"
                            icon-class="ri-speak-fill text-lg"
                            aria-label="Speak most reacted message"
                            @click="
                                speakMostReacted(
                                    'message',
                                    statsData.mostReactedMessage
                                )
                            "
                        />
                    </div>
                </div>
                <div class="text-sm text-gray-500 mt-1">
                    {{
                        countAddS(
                            statsData.mostReactedMessage.reactions_count,
                            "reaction"
                        )
                    }}
                    <span v-if="statsData.mostReactedMessage.user">
                        &middot; by
                        {{ statsData.mostReactedMessage.user.name }}</span
                    >
                    <span v-if="statsData.mostReactedMessage.created_at">
                        &middot;
                        {{
                            formatDate(statsData.mostReactedMessage.created_at)
                        }}</span
                    >
                </div>
            </div>

            <div
                v-if="statsData.mostReactedComment"
                class="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
            >
                <div class="flex items-start justify-between">
                    <div class="min-w-0">
                        <div class="text-sm text-gray-500">
                            Most reacted comment
                        </div>
                        <div class="font-medium truncate mt-1">
                            "{{ statsData.mostReactedComment.text }}"
                        </div>
                    </div>
                    <div class="ml-4">
                        <SpeakButton
                            :disabled="speaking"
                            icon-class="ri-speak-fill text-lg"
                            aria-label="Speak most reacted comment"
                            @click="
                                speakMostReacted(
                                    'comment',
                                    statsData.mostReactedComment
                                )
                            "
                        />
                    </div>
                </div>
                <div class="text-sm text-gray-500 mt-1">
                    {{
                        countAddS(
                            statsData.mostReactedComment.reactions_count,
                            "reaction"
                        )
                    }}
                    <span v-if="statsData.mostReactedComment.user">
                        &middot; by
                        {{ statsData.mostReactedComment.user.name }}</span
                    >
                    <span v-if="statsData.mostReactedComment.created_at">
                        &middot;
                        {{
                            formatDate(statsData.mostReactedComment.created_at)
                        }}</span
                    >
                </div>
            </div>

            <div
                v-if="statsData.mostActiveCommenterLast30Days"
                class="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
            >
                <div class="flex items-start justify-between">
                    <div class="min-w-0">
                        <div class="text-sm text-gray-500">
                            Most active commenter (30 days)
                        </div>
                        <div class="font-medium mt-1">
                            {{
                                statsData.mostActiveCommenterLast30Days.user
                                    .name
                            }}
                        </div>
                    </div>
                    <div class="ml-4">
                        <SpeakButton
                            :disabled="speaking"
                            icon-class="ri-speak-fill text-lg"
                            aria-label="Speak most active commenter"
                            @click="
                                speakMostActive(
                                    'most_active_commenter',
                                    statsData.mostActiveCommenterLast30Days
                                )
                            "
                        />
                    </div>
                </div>
                <div class="text-sm text-gray-500 mt-1">
                    {{
                        countAddS(
                            statsData.mostActiveCommenterLast30Days.count,
                            "comment"
                        )
                    }}
                </div>
            </div>

            <div
                v-if="statsData.mostActiveMessengerLast30Days"
                class="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
            >
                <div class="flex items-start justify-between">
                    <div class="min-w-0">
                        <div class="text-sm text-gray-500">
                            Most active poster (30 days)
                        </div>
                        <div class="font-medium mt-1">
                            {{
                                statsData.mostActiveMessengerLast30Days.user
                                    .name
                            }}
                        </div>
                    </div>
                    <div class="ml-4">
                        <SpeakButton
                            :disabled="speaking"
                            icon-class="ri-speak-fill text-lg"
                            aria-label="Speak most active poster"
                            @click="
                                speakMostActive(
                                    'most_active_poster',
                                    statsData.mostActiveMessengerLast30Days
                                )
                            "
                        />
                    </div>
                </div>
                <div class="text-sm text-gray-500 mt-1">
                    {{
                        countAddS(
                            statsData.mostActiveMessengerLast30Days.count,
                            "message"
                        )
                    }}
                </div>
            </div>

            <div
                v-if="statsData.busiestUploadDayOfWeek"
                class="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
            >
                <div class="flex items-start justify-between">
                    <div class="min-w-0">
                        <div class="text-sm text-gray-500">
                            Busiest upload day
                        </div>
                        <div class="font-medium mt-1">
                            {{ statsData.busiestUploadDayOfWeek.day }}
                        </div>
                    </div>
                    <div class="ml-4">
                        <SpeakButton
                            :disabled="speaking"
                            icon-class="ri-speak-fill text-lg"
                            aria-label="Speak busiest upload day"
                            @click="
                                speakBusiestDay(
                                    'busiest_upload_day',
                                    statsData.busiestUploadDayOfWeek
                                )
                            "
                        />
                    </div>
                </div>
                <div class="text-sm text-gray-500 mt-1">
                    {{
                        countAddS(
                            statsData.busiestUploadDayOfWeek.count,
                            "upload"
                        )
                    }}
                </div>
            </div>

            <div
                v-if="statsData.busiestMessageDayOfWeek"
                class="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm"
            >
                <div class="flex items-start justify-between">
                    <div class="min-w-0">
                        <div class="text-sm text-gray-500">
                            Busiest message day
                        </div>
                        <div class="font-medium mt-1">
                            {{ statsData.busiestMessageDayOfWeek.day }}
                        </div>
                    </div>
                    <div class="ml-4">
                        <SpeakButton
                            :disabled="speaking"
                            icon-class="ri-speak-fill text-lg"
                            aria-label="Speak busiest message day"
                            @click="
                                speakBusiestDay(
                                    'busiest_message_day',
                                    statsData.busiestMessageDayOfWeek
                                )
                            "
                        />
                    </div>
                </div>
                <div class="text-sm text-gray-500 mt-1">
                    {{
                        countAddS(
                            statsData.busiestMessageDayOfWeek.count,
                            "message"
                        )
                    }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import SpeakButton from "@/Components/SpeakButton.vue";
import { useMusicPlayer } from "@/composables/useMusicPlayer";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { Link } from "@inertiajs/vue3";
import { computed } from "vue";

const props = defineProps({
    stats: {
        type: Object,
        required: true,
    },
});

const { playSong, openFlyout, setFilter } = useMusicPlayer();

const openPopularSongs = () => {
    setFilter("favorites");
    openFlyout();
};

const statsData = computed(() => props.stats || {});

const hasEngagementStats = computed(
    () =>
        !!(
            statsData.value.mostReactedMessage ||
            statsData.value.mostReactedComment ||
            statsData.value.mostActiveCommenterLast30Days ||
            statsData.value.mostActiveMessengerLast30Days ||
            statsData.value.busiestUploadDayOfWeek ||
            statsData.value.busiestMessageDayOfWeek
        )
);

const { speak, speaking } = useSpeechSynthesis();
const { t } = useTranslations();

function formatCount(count) {
    return count?.toLocaleString?.() ?? 0;
}

function formatDate(isoString) {
    return new Date(isoString).toLocaleDateString();
}

function speakStat(key, count) {
    speak(t(`stats.${key}`, { count: formatCount(count) }));
}

function speakBookPageStat(key, book) {
    speak(
        t(`stats.${key}`, {
            title: book?.title || "",
            count: book?.pages_count || 0,
        })
    );
}

// Backend sends an English day name ("Sunday"); speak it in the active locale.
function dayName(day) {
    if (!day) return "";
    const key = `stats.day.${String(day).toLowerCase()}`;
    const translated = t(key);
    return translated === key ? day : translated;
}

function speakMostReacted(kind, item) {
    if (!item) return;

    const key = item.user?.name
        ? `stats.most_reacted_${kind}`
        : `stats.most_reacted_${kind}_anon`;

    speak(
        t(key, {
            text: item.text || "",
            count: formatCount(item.reactions_count),
            user: item.user?.name || "",
        })
    );
}

function speakMostActive(key, entry) {
    if (!entry) return;

    speak(
        t(`stats.${key}`, {
            user: entry.user?.name || "",
            count: formatCount(entry.count),
        })
    );
}

function speakBusiestDay(key, entry) {
    if (!entry) return;

    speak(
        t(`stats.${key}`, {
            day: dayName(entry.day),
            count: formatCount(entry.count),
        })
    );
}

// Accept either a number or a string (possibly already formatted with commas).
function countAddS(count, word) {
    const countStr =
        typeof count === "number" ? String(count) : String(count || "0");
    // Remove commas so we can reliably parse the numeric value.
    const numeric = Number(countStr.replace(/,/g, ""));
    const display =
        typeof count === "number" ? numeric.toLocaleString() : countStr;
    const singular = numeric === 1;
    return `${display} ${singular ? word : `${word}s`}`;
}

// Speak the top 5 books as a single short phrase.
function speakTopBooks() {
    const books = statsData.value?.mostReadBooks || [];
    if (!books.length) return;

    const items = books.slice(0, 5).map((b, i) => `${i + 1}. ${b.title}`);
    const phrase = t("stats.top_books", { list: items.join(". ") });
    speak(phrase);
}

function speakTopSongs() {
    const songs = statsData.value?.mostReadSongs || [];
    if (!songs.length) return;

    const items = songs.slice(0, 5).map((s, i) => `${i + 1}. ${s.title}`);
    const phrase = t("stats.top_songs", { list: items.join(". ") });
    speak(phrase);
}
</script>
