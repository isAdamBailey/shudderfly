<template>
    <div>
        <div
            v-if="currentAddress && showAddress"
            class="mb-2 flex items-center gap-2 text-sm text-gray-500"
        >
            <div><strong>Address:</strong> {{ currentAddress }}</div>
            <Button
                type="button"
                :disabled="speaking"
                class="speak-btn"
                aria-label="Speak address"
                @click="speak(`the address is ${currentAddress}`)"
            >
                <i class="ri-speak-fill text-lg"></i>
            </Button>
        </div>
        <div v-if="apiKeyMissing" class="p-4 text-center text-red-600 bg-red-50 rounded-lg">
            Google Maps API key is not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.
        </div>
        <div v-else ref="mapContainer" :class="containerClass"></div>
        <Accordion
            v-if="showStreetView && hasStreetViewData"
            v-model="streetViewAccordionOpen"
            title="Street View"
            :dark-background="true"
            :compact="true"
            class="mt-2 rounded-lg overflow-hidden"
        >
            <div
                ref="streetViewContainer"
                :class="containerClass"
            ></div>
        </Accordion>
    </div>
</template>

<script setup>
/* global route */
import Accordion from "@/Components/Accordion.vue";
import Button from "@/Components/Button.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps({
    latitude: {
        type: [Number, String],
        default: null,
    },
    longitude: {
        type: [Number, String],
        default: null,
    },
    locations: {
        type: Array,
        default: () => [],
    },
    title: {
        type: String,
        default: "",
    },
    bookTitle: {
        type: String,
        default: "",
    },
    interactive: {
        type: Boolean,
        default: false,
    },
    defaultLat: {
        type: Number,
        default: 45.6387,
    },
    defaultLng: {
        type: Number,
        default: -122.6615,
    },
    containerClass: {
        type: String,
        default:
            "w-full aspect-square rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shadow-lg",
    },
    showAddress: {
        type: Boolean,
        default: true,
    },
    showStreetView: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits([
    "update:latitude",
    "update:longitude",
    "location-selected",
]);

const { speak, speaking } = useSpeechSynthesis();

const mapContainer = ref(null);
const streetViewContainer = ref(null);
const currentAddress = ref(null);
const hasStreetViewData = ref(false);
const streetViewAccordionOpen = ref(false);
const pendingStreetViewCoords = ref(null);
const apiKeyMissing = ref(false);

let map = null;
let markers = [];
let infoWindows = [];
let streetViewPanorama = null;
let mapLinkClickHandler = null;
let isInitialized = false;
let mapsLibrary = null;
let geocoder = null;
let autocompleteService = null;
let apiOptionsSet = false;
let mapListeners = [];

const isGoogleLoaded = () => {
    return typeof window !== "undefined" && typeof window.google !== "undefined" && window.google.maps;
};

const recenterOnMarker = () => {
    if (map && markers.length > 0) {
        const marker = markers[0];
        const position = marker.getPosition();
        map.setCenter(position);
        map.setZoom(17);
    } else if (map && props.latitude != null && props.longitude != null) {
        map.setCenter({ lat: Number(props.latitude), lng: Number(props.longitude) });
        map.setZoom(17);
    }
};

const geocodeAddress = async (query) => {
    if (!map || !isInitialized || !geocoder) {
        throw new Error("Map not initialized");
    }

    return new Promise((resolve, reject) => {
        geocoder.geocode({ address: query }, async (results, status) => {
            if (status === "OK" && results && results.length > 0) {
                const location = results[0].geometry.location;
                const lat = location.lat();
                const lng = location.lng();

                clearMarkers();
                await updateAddress(lat, lng);

                const marker = new window.google.maps.Marker({
                    position: { lat, lng },
                    map: map,
                });
                markers.push(marker);

                map.setCenter({ lat, lng });
                map.setZoom(17);

                emit("update:latitude", lat);
                emit("update:longitude", lng);
                emit("location-selected", { lat, lng });

                resolve({ lat, lng });
            } else {
                reject(new Error("Geocode failed: " + status));
            }
        });
    });
};

const geocodeByPlaceId = (placeId) => {
    return new Promise((resolve, reject) => {
        if (!geocoder) {
            reject(new Error("Geocoder not initialized"));
            return;
        }
        geocoder.geocode({ placeId }, (results, status) => {
            if (status === "OK" && results && results.length > 0) {
                const location = results[0].geometry.location;
                resolve({
                    lat: location.lat(),
                    lng: location.lng(),
                });
            } else {
                reject(new Error("Place geocode failed: " + status));
            }
        });
    });
};

const getGeocodeSuggestions = async (query) => {
    if (!map || !isInitialized || !query || query.length < 3) {
        return [];
    }

    if (!isGoogleLoaded()) {
        return [];
    }

    if (!autocompleteService) {
        autocompleteService = new window.google.maps.places.AutocompleteService();
    }

    return new Promise((resolve) => {
        autocompleteService.getPlacePredictions(
            { input: query },
            async (predictions, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                    const results = await Promise.all(
                        predictions.map(async (prediction) => {
                            let center = null;
                            try {
                                center = await geocodeByPlaceId(prediction.place_id);
                            } catch (e) {
                                // If geocoding fails, leave center null
                            }
                            return {
                                name: prediction.description,
                                displayName: prediction.description,
                                placeId: prediction.place_id,
                                center,
                            };
                        })
                    );
                    resolve(results);
                } else {
                    resolve([]);
                }
            }
        );
    });
};

const reverseGeocode = async (lat, lng) => {
    if (lat == null || lng == null) {
        throw new Error("Invalid coordinates");
    }

    const response = await fetch(
        `/api/geocode/reverse?lat=${lat}&lng=${lng}`,
        {
            method: "GET",
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        }
    );

    if (!response.ok) {
        throw new Error(`Reverse geocode request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.displayName) {
        return {
            displayName: data.displayName,
            address: data.address || {},
            lat: parseFloat(data.lat),
            lng: parseFloat(data.lng),
            raw: data.raw || data,
        };
    }

    throw new Error("No address found for coordinates");
};

const updateAddress = async (lat, lng) => {
    if (lat == null || lng == null) {
        currentAddress.value = null;
        return null;
    }

    const numLat = typeof lat === "string" ? parseFloat(lat) : lat;
    const numLng = typeof lng === "string" ? parseFloat(lng) : lng;

    if (isNaN(numLat) || isNaN(numLng)) {
        currentAddress.value = null;
        return null;
    }

    try {
        const result = await reverseGeocode(numLat, numLng);
        if (result && result.displayName) {
            currentAddress.value = result.displayName;
            return result;
        } else {
            currentAddress.value = null;
            return null;
        }
    } catch (error) {
        currentAddress.value = null;
        return null;
    }
};

const clearMarkers = () => {
    markers.forEach((marker) => {
        marker.setMap(null);
    });
    markers = [];
    infoWindows.forEach((iw) => iw.close());
    infoWindows = [];
};

const disposeMap = () => {
    clearMarkers();

    if (mapLinkClickHandler) {
        document.removeEventListener("click", mapLinkClickHandler, true);
        mapLinkClickHandler = null;
    }

    mapListeners.forEach((listener) => {
        if (isGoogleLoaded() && listener) {
            window.google.maps.event.removeListener(listener);
        }
    });
    mapListeners = [];

    if (map && isGoogleLoaded()) {
        window.google.maps.event.clearInstanceListeners(map);
    }

    if (mapContainer.value) {
        mapContainer.value.innerHTML = "";
    }

    map = null;
};

const checkStreetViewAvailability = (lat, lng) => {
    if (!isGoogleLoaded() || !props.showStreetView) return;

    const streetViewService = new window.google.maps.StreetViewService();
    const location = new window.google.maps.LatLng(lat, lng);

    streetViewService.getPanorama(
        { location: location, radius: 50 },
        (data, status) => {
            if (status === window.google.maps.StreetViewStatus.OK) {
                hasStreetViewData.value = true;
                pendingStreetViewCoords.value = { lat, lng };
            } else {
                hasStreetViewData.value = false;
                pendingStreetViewCoords.value = null;
            }
        }
    );
};

const disposeStreetView = () => {
    if (streetViewPanorama) {
        if (isGoogleLoaded()) {
            window.google.maps.event.clearInstanceListeners(streetViewPanorama);
        }
        streetViewPanorama.setVisible(false);
        streetViewPanorama = null;
    }
    if (streetViewContainer.value) {
        streetViewContainer.value.innerHTML = "";
    }
};

const initStreetView = (lat, lng) => {
    if (!streetViewContainer.value || !isGoogleLoaded()) return;

    disposeStreetView();

    streetViewPanorama = new window.google.maps.StreetViewPanorama(
        streetViewContainer.value,
        {
            position: { lat, lng },
            pov: { heading: 0, pitch: 0 },
            zoom: 1,
            disableDefaultUI: true,
            panControl: true,
            zoomControl: true,
            enableCloseButton: false,
            linksControl: false,
            addressControl: false,
            fullscreenControl: false,
            showRoadLabels: false,
            clickToGo: true,
            scrollwheel: true,
        }
    );
};

defineExpose({
    recenterOnMarker,
    geocodeAddress,
    getGeocodeSuggestions,
    reverseGeocode,
});

const initializeMap = async () => {
    if (!mapContainer.value) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.error("Google Maps API key is missing. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file.");
        apiKeyMissing.value = true;
        return;
    }

    try {
        const container = mapContainer.value;
        container.style.minHeight = "300px";
        container.style.height = "300px";

        const rect = container.getBoundingClientRect();
        const hasDimensions = rect.width > 0 && rect.height > 0;

        if (!hasDimensions) {
            setTimeout(() => {
                if (mapContainer.value) {
                    initializeMap();
                }
            }, 100);
            return;
        }

        const lat =
            props.latitude != null
                ? typeof props.latitude === "string"
                    ? parseFloat(props.latitude)
                    : props.latitude
                : null;
        const lng =
            props.longitude != null
                ? typeof props.longitude === "string"
                    ? parseFloat(props.longitude)
                    : props.longitude
                : null;

        const isMultipleMode = props.locations && props.locations.length > 0;
        const isSingleMode = lat != null && lng != null;

        disposeMap();

        currentAddress.value = null;
        hasStreetViewData.value = false;

        let centerLat, centerLng, zoom;

        if (isMultipleMode) {
            const validLocations = [];
            props.locations.forEach((location) => {
                if (location.latitude != null && location.longitude != null) {
                    const locLat =
                        typeof location.latitude === "string"
                            ? parseFloat(location.latitude)
                            : location.latitude;
                    const locLng =
                        typeof location.longitude === "string"
                            ? parseFloat(location.longitude)
                            : location.longitude;

                    if (
                        !isNaN(locLat) &&
                        !isNaN(locLng) &&
                        locLat >= -90 &&
                        locLat <= 90 &&
                        locLng >= -180 &&
                        locLng <= 180
                    ) {
                        validLocations.push({ lat: locLat, lng: locLng });
                    }
                }
            });

            if (validLocations.length === 0) {
                centerLat = props.defaultLat;
                centerLng = props.defaultLng;
                zoom = 13;
            } else {
                centerLat = validLocations[0].lat;
                centerLng = validLocations[0].lng;
                zoom = 13;
            }
        } else if (isSingleMode) {
            centerLat = lat;
            centerLng = lng;
            zoom = 17;
        } else {
            centerLat = props.defaultLat;
            centerLng = props.defaultLng;
            zoom = 15;
        }

        const centerLatNum =
            typeof centerLat === "string" ? parseFloat(centerLat) : centerLat;
        const centerLngNum =
            typeof centerLng === "string" ? parseFloat(centerLng) : centerLng;

        if (
            isNaN(centerLatNum) ||
            isNaN(centerLngNum) ||
            centerLatNum < -90 ||
            centerLatNum > 90 ||
            centerLngNum < -180 ||
            centerLngNum > 180
        ) {
            centerLat = props.defaultLat;
            centerLng = props.defaultLng;
        } else {
            centerLat = centerLatNum;
            centerLng = centerLngNum;
        }

        if (!apiOptionsSet) {
            setOptions({
                key: apiKey,
                v: "weekly",
            });
            apiOptionsSet = true;
        }

        if (!mapsLibrary) {
            mapsLibrary = await importLibrary("maps");
            await importLibrary("places");
            await importLibrary("streetView");
        }
        if (!geocoder) {
            geocoder = new window.google.maps.Geocoder();
        }

        map = new window.google.maps.Map(mapContainer.value, {
            center: { lat: centerLat, lng: centerLng },
            zoom: zoom,
            mapTypeId: window.google.maps.MapTypeId.HYBRID,
            disableDefaultUI: true,
            zoomControl: true,
            streetViewControl: false,
            clickableIcons: false,
            gestureHandling: "cooperative",
        });

        if (isMultipleMode) {
            if (!mapLinkClickHandler) {
                mapLinkClickHandler = (e) => {
                    const path = e.composedPath ? e.composedPath() : [e.target];
                    const el = path.find((node) =>
                        node?.classList?.contains?.("shudderfly-map-link")
                    );
                    if (el) {
                        e.preventDefault();
                        e.stopPropagation();
                        const href = el.getAttribute("href") || el.getAttribute("data-href");
                        if (href && href !== "#") {
                            window.location.href = href;
                        }
                    }
                };
                document.addEventListener("click", mapLinkClickHandler, true);
            }

            const bounds = new window.google.maps.LatLngBounds();
            let hasValidMarkers = false;

            props.locations.forEach((location) => {
                if (location.latitude != null && location.longitude != null) {
                    const locLat =
                        typeof location.latitude === "string"
                            ? parseFloat(location.latitude)
                            : location.latitude;
                    const locLng =
                        typeof location.longitude === "string"
                            ? parseFloat(location.longitude)
                            : location.longitude;

                    if (!isNaN(locLat) && !isNaN(locLng)) {
                        hasValidMarkers = true;
                        bounds.extend({ lat: locLat, lng: locLng });

                        const url = location.book_slug
                            ? route("books.show", location.book_slug)
                            : location.id
                            ? route("pages.show", location.id)
                            : "#";

                        const safeUrl = String(url).replace(/"/g, "&quot;");
                        const popupContent = location.page_title
                            ? `<span role="link" tabindex="0" class="shudderfly-map-link text-blue-600 hover:text-blue-800 underline cursor-pointer" data-href="${safeUrl}"><strong>${location.page_title}</strong></span>${
                                  location.book_title
                                      ? `<br><em>${location.book_title}</em>`
                                      : ""
                              }`
                            : location.book_title
                            ? `<span role="link" tabindex="0" class="shudderfly-map-link text-blue-600 hover:text-blue-800 underline cursor-pointer" data-href="${safeUrl}"><strong>${location.book_title}</strong></span>`
                            : `<span role="link" tabindex="0" class="shudderfly-map-link text-blue-600 hover:text-blue-800 underline cursor-pointer" data-href="${safeUrl}">Location</span>`;

                        const marker = new window.google.maps.Marker({
                            position: { lat: locLat, lng: locLng },
                            map: map,
                        });

                        const infoWindow = new window.google.maps.InfoWindow({
                            content: popupContent,
                        });

                        window.google.maps.event.addListener(infoWindow, "domready", () => {
                            document
                                .querySelectorAll(".shudderfly-map-link")
                                .forEach((el) => {
                                    const href = el.getAttribute("data-href");
                                    if (!href || href === "#") return;
                                    const nav = () => {
                                        window.location.href = href;
                                    };
                                    el.addEventListener("click", nav);
                                    el.addEventListener("keydown", (e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            nav();
                                        }
                                    });
                                });
                        });

                        const clickListener = marker.addListener("click", () => {
                            infoWindows.forEach((iw) => iw.close());
                            infoWindow.open(map, marker);
                        });
                        mapListeners.push(clickListener);

                        markers.push(marker);
                        infoWindows.push(infoWindow);
                    }
                }
            });

            if (hasValidMarkers && markers.length > 1) {
                setTimeout(() => {
                    if (map) {
                        map.fitBounds(bounds, { padding: 20 });
                        const currentZoom = map.getZoom();
                        if (currentZoom > 15) {
                            map.setZoom(15);
                        }
                    }
                }, 100);
            } else if (markers.length === 1) {
                setTimeout(() => {
                    if (map && markers[0]) {
                        map.setCenter(markers[0].getPosition());
                        map.setZoom(17);
                    }
                }, 100);
            }
        } else if (isSingleMode || (props.interactive && isSingleMode)) {
            const popupContent = props.title
                ? `<strong>${props.title}</strong>${
                      props.bookTitle ? `<br><em>${props.bookTitle}</em>` : ""
                  }`
                : props.bookTitle
                ? `<strong>${props.bookTitle}</strong>`
                : "Location";

            const marker = new window.google.maps.Marker({
                position: { lat, lng },
                map: map,
            });

            setTimeout(() => {
                updateAddress(lat, lng);
            }, 100);

            if (!props.interactive) {
                const infoWindow = new window.google.maps.InfoWindow({
                    content: popupContent,
                });

                const clickListener = marker.addListener("click", () => {
                    infoWindow.open(map, marker);
                });
                mapListeners.push(clickListener);

                infoWindows.push(infoWindow);
            }

            markers.push(marker);

            if (props.showStreetView) {
                checkStreetViewAvailability(lat, lng);
            }
        }

        const hasLocation = (lat != null && lng != null) || markers.length > 0;
        if (hasLocation) {
            const recenterDiv = document.createElement("div");
            recenterDiv.innerHTML = `
                <button
                    type="button"
                    class="gm-recenter-btn"
                    title="Recenter on marker"
                    style="
                        background-color: white;
                        border: none;
                        border-radius: 2px;
                        width: 40px;
                        height: 40px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: rgba(0, 0, 0, 0.3) 0px 1px 4px -1px;
                        margin: 10px;
                    "
                >
                    <span style="font-size: 20px;">📍</span>
                </button>
            `;

            recenterDiv.addEventListener("click", () => {
                if (markers.length > 0) {
                    const marker = markers[0];
                    map.setCenter(marker.getPosition());
                    map.setZoom(17);
                } else if (lat != null && lng != null) {
                    map.setCenter({ lat, lng });
                    map.setZoom(17);
                }
            });

            map.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(recenterDiv);
        }

        if (props.interactive) {
            const clickListener = map.addListener("click", async (e) => {
                const clickLat = e.latLng.lat();
                const clickLng = e.latLng.lng();

                clearMarkers();
                await updateAddress(clickLat, clickLng);

                const marker = new window.google.maps.Marker({
                    position: { lat: clickLat, lng: clickLng },
                    map: map,
                });
                markers.push(marker);

                emit("update:latitude", clickLat);
                emit("update:longitude", clickLng);
                emit("location-selected", { lat: clickLat, lng: clickLng });

                if (props.showStreetView) {
                    checkStreetViewAvailability(clickLat, clickLng);
                }
            });
            mapListeners.push(clickListener);
        }

        isInitialized = true;
    } catch (error) {
        console.error("Failed to initialize Google Map:", error);
        isInitialized = false;
    }
};

onMounted(() => {
    nextTick(() => {
        if (props.locations && props.locations.length > 0) {
            initializeMap();
        } else {
            setTimeout(() => {
                initializeMap();
            }, 50);
        }
    });
});

watch(
    () => [props.latitude, props.longitude],
    ([newLat, newLng]) => {
        if (map && !props.locations?.length) {
            const lat =
                newLat != null
                    ? typeof newLat === "string"
                        ? parseFloat(newLat)
                        : newLat
                    : null;
            const lng =
                newLng != null
                    ? typeof newLng === "string"
                        ? parseFloat(newLng)
                        : newLng
                    : null;

            clearMarkers();

            if (lat != null && lng != null && isGoogleLoaded()) {
                const popupContent = props.title
                    ? `<strong>${props.title}</strong>${
                          props.bookTitle
                              ? `<br><em>${props.bookTitle}</em>`
                              : ""
                      }`
                    : props.bookTitle
                    ? `<strong>${props.bookTitle}</strong>`
                    : "Location";

                const marker = new window.google.maps.Marker({
                    position: { lat, lng },
                    map: map,
                });

                const infoWindow = new window.google.maps.InfoWindow({
                    content: popupContent,
                });

                const clickListener = marker.addListener("click", () => {
                    infoWindow.open(map, marker);
                });
                mapListeners.push(clickListener);

                setTimeout(() => {
                    updateAddress(lat, lng);
                }, 100);

                markers.push(marker);
                infoWindows.push(infoWindow);

                if (!props.interactive) {
                    map.setCenter({ lat, lng });
                    map.setZoom(17);
                } else {
                    map.setCenter({ lat, lng });
                    map.setZoom(15);
                }

                if (props.showStreetView) {
                    checkStreetViewAvailability(lat, lng);
                }
            }
        }
    }
);

watch(
    () => props.locations,
    (newLocations) => {
        if (!isInitialized && newLocations && newLocations.length > 0) {
            nextTick(() => {
                initializeMap();
            });
            return;
        }

        if (isInitialized) {
            nextTick(() => {
                initializeMap();
            });
        }
    },
    { deep: true, immediate: true }
);

watch(streetViewAccordionOpen, (isOpen) => {
    if (isOpen && pendingStreetViewCoords.value && !streetViewPanorama) {
        nextTick(() => {
            const { lat, lng } = pendingStreetViewCoords.value;
            initStreetView(lat, lng);
        });
    }
});

watch(hasStreetViewData, (hasData) => {
    if (!hasData) {
        disposeStreetView();
        pendingStreetViewCoords.value = null;
        streetViewAccordionOpen.value = false;
    }
});

onUnmounted(() => {
    disposeMap();
    disposeStreetView();
    mapsLibrary = null;
    geocoder = null;
    autocompleteService = null;
});
</script>
