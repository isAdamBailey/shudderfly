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
        <div ref="mapContainer" :class="containerClass"></div>
        <Accordion
            v-if="showStreetView && hasStreetViewData"
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
/* global route, google */
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
    hideGeocoder: {
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

let map = null;
let markers = [];
let infoWindows = [];
let streetViewPanorama = null;
let isInitialized = false;
let mapsLibrary = null;
let geocoder = null;
let autocompleteService = null;
let apiOptionsSet = false;

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

                const marker = new google.maps.Marker({
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

const getGeocodeSuggestions = async (query) => {
    if (!map || !isInitialized || !query || query.length < 3) {
        return [];
    }

    if (!autocompleteService) {
        autocompleteService = new google.maps.places.AutocompleteService();
    }

    return new Promise((resolve) => {
        autocompleteService.getPlacePredictions(
            { input: query },
            (predictions, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                    const results = predictions.map((prediction) => ({
                        name: prediction.description,
                        displayName: prediction.description,
                        placeId: prediction.place_id,
                        center: null,
                    }));
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

const checkStreetViewAvailability = (lat, lng) => {
    if (!google || !props.showStreetView) return;

    const streetViewService = new google.maps.StreetViewService();
    const location = new google.maps.LatLng(lat, lng);

    streetViewService.getPanorama(
        { location: location, radius: 50 },
        (data, status) => {
            if (status === google.maps.StreetViewStatus.OK) {
                hasStreetViewData.value = true;
                nextTick(() => {
                    initStreetView(lat, lng);
                });
            } else {
                hasStreetViewData.value = false;
            }
        }
    );
};

const initStreetView = (lat, lng) => {
    if (!streetViewContainer.value || !google) return;

    if (streetViewPanorama) {
        streetViewPanorama.setPosition({ lat, lng });
        return;
    }

    streetViewPanorama = new google.maps.StreetViewPanorama(
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

        if (map) {
            clearMarkers();
            map = null;
        }

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

        // Load Google Maps API using new functional API (only set options once)
        if (!apiOptionsSet) {
            setOptions({
                key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
                v: "weekly",
            });
            apiOptionsSet = true;
        }

        // Import required libraries (safe to call multiple times)
        if (!mapsLibrary) {
            mapsLibrary = await importLibrary("maps");
            await importLibrary("places");
            await importLibrary("streetView");
        }
        if (!geocoder) {
            geocoder = new google.maps.Geocoder();
        }

        map = new google.maps.Map(mapContainer.value, {
            center: { lat: centerLat, lng: centerLng },
            zoom: zoom,
            mapTypeId: google.maps.MapTypeId.HYBRID,
            disableDefaultUI: true,
            zoomControl: true,
            streetViewControl: false,
            clickableIcons: false,
            gestureHandling: "cooperative",
        });

        // Add markers based on mode
        if (isMultipleMode) {
            const bounds = new google.maps.LatLngBounds();
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

                        const popupContent = location.page_title
                            ? `<a href="${url}" class="text-blue-600 hover:text-blue-800 underline"><strong>${location.page_title}</strong></a>${
                                  location.book_title
                                      ? `<br><em>${location.book_title}</em>`
                                      : ""
                              }`
                            : location.book_title
                            ? `<a href="${url}" class="text-blue-600 hover:text-blue-800 underline"><strong>${location.book_title}</strong></a>`
                            : `<a href="${url}" class="text-blue-600 hover:text-blue-800 underline">Location</a>`;

                        const marker = new google.maps.Marker({
                            position: { lat: locLat, lng: locLng },
                            map: map,
                        });

                        const infoWindow = new google.maps.InfoWindow({
                            content: popupContent,
                        });

                        marker.addListener("click", () => {
                            infoWindows.forEach((iw) => iw.close());
                            infoWindow.open(map, marker);
                        });

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

            const marker = new google.maps.Marker({
                position: { lat, lng },
                map: map,
            });

            setTimeout(() => {
                updateAddress(lat, lng);
            }, 100);

            if (!props.interactive) {
                const infoWindow = new google.maps.InfoWindow({
                    content: popupContent,
                });

                marker.addListener("click", () => {
                    infoWindow.open(map, marker);
                });

                infoWindows.push(infoWindow);
            }

            markers.push(marker);

            if (props.showStreetView) {
                checkStreetViewAvailability(lat, lng);
            }
        }

        // Add recenter button
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

            map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(recenterDiv);
        }

        // Add click handler for interactive mode
        if (props.interactive) {
            map.addListener("click", async (e) => {
                const clickLat = e.latLng.lat();
                const clickLng = e.latLng.lng();

                clearMarkers();
                await updateAddress(clickLat, clickLng);

                const marker = new google.maps.Marker({
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

            if (lat != null && lng != null) {
                const popupContent = props.title
                    ? `<strong>${props.title}</strong>${
                          props.bookTitle
                              ? `<br><em>${props.bookTitle}</em>`
                              : ""
                      }`
                    : props.bookTitle
                    ? `<strong>${props.bookTitle}</strong>`
                    : "Location";

                const marker = new google.maps.Marker({
                    position: { lat, lng },
                    map: map,
                });

                const infoWindow = new google.maps.InfoWindow({
                    content: popupContent,
                });

                marker.addListener("click", () => {
                    infoWindow.open(map, marker);
                });

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

onUnmounted(() => {
    clearMarkers();
    if (streetViewPanorama) {
        streetViewPanorama = null;
    }
    map = null;
    mapsLibrary = null;
    geocoder = null;
    autocompleteService = null;
});
</script>
