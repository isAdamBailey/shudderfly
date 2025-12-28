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
    </div>
</template>

<script setup>
/* eslint-disable no-undef */
import Button from "@/Components/Button.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import L from "leaflet";
import { Geocoder } from "leaflet-control-geocoder";
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps({
    // Single location mode
    latitude: {
        type: [Number, String],
        default: null,
    },
    longitude: {
        type: [Number, String],
        default: null,
    },
    // Multiple locations mode
    locations: {
        type: Array,
        default: () => [],
    },
    // Popup content for single location
    title: {
        type: String,
        default: "",
    },
    bookTitle: {
        type: String,
        default: "",
    },
    // Interactive mode (for picker)
    interactive: {
        type: Boolean,
        default: false,
    },
    // Hide geocoder control on map (for external search input)
    hideGeocoder: {
        type: Boolean,
        default: false,
    },
    // Default center when no location
    defaultLat: {
        type: Number,
        default: 45.6387, // Vancouver, WA
    },
    defaultLng: {
        type: Number,
        default: -122.6615,
    },
    // Container class
    containerClass: {
        type: String,
        default:
            "w-full aspect-square rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shadow-lg",
    },
    // Show address above map
    showAddress: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits([
    "update:latitude",
    "update:longitude",
    "location-selected",
]);

const { speak, speaking } = useSpeechSynthesis();

const mapContainer = ref(null);
const currentAddress = ref(null);
let map = null;
let markers = [];
let isInitialized = false;
let geocoderInstance = null;
let visibilityObserver = null;
let resizeObserver = null;

// Expose recenter method
const recenterOnMarker = () => {
    if (map && markers.length > 0) {
        const marker = markers[0];
        const latLng = marker.getLatLng();
        map.setView(latLng, 17);
    } else if (map && props.latitude != null && props.longitude != null) {
        map.setView([props.latitude, props.longitude], 17);
    }
};

// Expose geocode method for external search
const geocodeAddress = async (query) => {
    if (!map || !isInitialized) {
        throw new Error("Map not initialized");
    }

    // Ensure geocoder instance exists and is added to map (hidden)
    if (!geocoderInstance) {
        try {
            geocoderInstance = new Geocoder({
                defaultMarkGeocode: false,
            });
            geocoderInstance.addTo(map);
            // Hide the control visually
            setTimeout(() => {
                const controlElement = map
                    .getContainer()
                    .querySelector(".leaflet-control-geocoder");
                if (controlElement) {
                    controlElement.style.display = "none";
                }
            }, 100);
        } catch (error) {
            throw new Error("Failed to initialize geocoder");
        }
    }

    return new Promise((resolve, reject) => {
        let timeoutId;

        // Set up a one-time listener for the geocode result
        const onGeocode = async (e) => {
            geocoderInstance.off("markgeocode", onGeocode);
            geocoderInstance.off("error", onError);
            if (timeoutId) clearTimeout(timeoutId);

            const { lat, lng } = e.geocode.center;

            // Remove existing marker
            markers.forEach((marker) => {
                map.removeLayer(marker);
            });
            markers = [];

            // Fetch address for display above map
            await updateAddress(lat, lng);

            // Add new marker at geocoded location
            const marker = L.marker([lat, lng]).addTo(map);
            markers.push(marker);

            // Center map on geocoded location
            map.setView([lat, lng], 17);

            // Emit coordinates
            emit("update:latitude", lat);
            emit("update:longitude", lng);
            emit("location-selected", { lat, lng });

            resolve({ lat, lng });
        };

        const onError = () => {
            geocoderInstance.off("markgeocode", onGeocode);
            geocoderInstance.off("error", onError);
            if (timeoutId) clearTimeout(timeoutId);
            reject(new Error("Geocode failed"));
        };

        geocoderInstance.on("markgeocode", onGeocode);
        geocoderInstance.on("error", onError);

        // Wait a bit for geocoder to be fully initialized, then trigger geocode
        setTimeout(() => {
            try {
                // Try to access the geocoding service
                // In leaflet-control-geocoder, the service is typically in _geocoder
                const geocodingService = geocoderInstance._geocoder;

                if (
                    geocodingService &&
                    typeof geocodingService.geocode === "function"
                ) {
                    geocodingService.geocode(query, (results) => {
                        if (results && results.length > 0) {
                            const result = results[0];
                            const center = result.center;
                            if (center) {
                                onGeocode({ geocode: { center } });
                            } else {
                                onError();
                            }
                        } else {
                            onError();
                        }
                    });
                } else {
                    // Fallback: use the input field to trigger search
                    const input =
                        geocoderInstance._input ||
                        map
                            .getContainer()
                            .querySelector(".leaflet-control-geocoder input");
                    if (input) {
                        input.value = query;
                        // Trigger the geocode by calling the internal method or simulating Enter
                        if (typeof geocoderInstance._geocode === "function") {
                            geocoderInstance._geocode();
                        } else {
                            // Simulate Enter key press
                            const enterEvent = new KeyboardEvent("keydown", {
                                key: "Enter",
                                code: "Enter",
                                keyCode: 13,
                                bubbles: true,
                            });
                            input.dispatchEvent(enterEvent);
                        }
                    } else {
                        onError();
                    }
                }
            } catch (error) {
                onError();
            }
        }, 200);

        // Timeout after 10 seconds
        timeoutId = setTimeout(() => {
            geocoderInstance.off("markgeocode", onGeocode);
            geocoderInstance.off("error", onError);
            reject(new Error("Geocode request timed out"));
        }, 10000);
    });
};

// Expose method to get geocode suggestions (for autocomplete)
// Use Nominatim API directly since geocoder's internal service isn't accessible
const getGeocodeSuggestions = async (query) => {
    if (!map || !isInitialized || !query || query.length < 3) {
        return [];
    }

    try {
        // Use Nominatim geocoding API directly (same as leaflet-control-geocoder uses)
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
        )}&limit=5&addressdetails=1`;

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Shudderfly App", // Nominatim requires a user agent
            },
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();

        if (data && data.length > 0) {
            return data.map((result) => {
                const displayName = result.display_name || result.name || query;
                return {
                    ...result,
                    name: displayName,
                    displayName: displayName,
                    center: {
                        lat: parseFloat(result.lat),
                        lng: parseFloat(result.lon),
                    },
                    formatted: result.display_name,
                };
            });
        }

        return [];
    } catch (error) {
        return [];
    }
};

// Reverse geocode: get address from coordinates
const reverseGeocode = async (lat, lng) => {
    if (lat == null || lng == null) {
        throw new Error("Invalid coordinates");
    }

    try {
        // Use backend API endpoint to avoid CORS issues
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
            throw new Error(
                `Reverse geocode request failed: ${response.status}`
            );
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
    } catch (error) {
        throw error;
    }
};

// Helper function to fetch and update address
const updateAddress = async (lat, lng) => {
    if (lat == null || lng == null) {
        currentAddress.value = null;
        return null;
    }

    // Validate coordinates are numbers
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

defineExpose({
    recenterOnMarker,
    geocodeAddress,
    getGeocodeSuggestions,
    reverseGeocode,
});

// Fix for default marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const initializeMap = () => {
    if (!mapContainer.value) return;

    try {
        // Ensure container has dimensions before initializing
        // Force height immediately to ensure container is ready
        const container = mapContainer.value;
        container.style.minHeight = "300px";
        container.style.height = "300px";

        const rect = container.getBoundingClientRect();
        const hasDimensions = rect.width > 0 && rect.height > 0;

        // If container still doesn't have dimensions, wait briefly and try once more
        if (!hasDimensions) {
            setTimeout(() => {
                if (mapContainer.value) {
                    initializeMap();
                }
            }, 100);
            return;
        }

        // Convert string props to numbers
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

        // Determine if we're in multiple locations mode
        const isMultipleMode = props.locations && props.locations.length > 0;
        const isSingleMode = lat != null && lng != null;

        // If map already exists, remove it first
        if (map) {
            markers.forEach((marker) => {
                map.removeLayer(marker);
            });
            markers = [];
            map.remove();
            map = null;
        }

        // Clear address when reinitializing
        currentAddress.value = null;

        // Clean up existing observers
        if (visibilityObserver) {
            visibilityObserver.disconnect();
            visibilityObserver = null;
        }
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }

        let centerLat, centerLng, zoom;

        if (isMultipleMode) {
            // Multiple locations mode
            const validLocations = [];
            props.locations.forEach((location) => {
                if (location.latitude != null && location.longitude != null) {
                    const lat =
                        typeof location.latitude === "string"
                            ? parseFloat(location.latitude)
                            : location.latitude;
                    const lng =
                        typeof location.longitude === "string"
                            ? parseFloat(location.longitude)
                            : location.longitude;

                    if (
                        !isNaN(lat) &&
                        !isNaN(lng) &&
                        lat >= -90 &&
                        lat <= 90 &&
                        lng >= -180 &&
                        lng <= 180
                    ) {
                        validLocations.push({ lat, lng });
                    }
                }
            });

            // If no valid locations, use default center but still initialize the map
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
            // Single location mode
            centerLat = lat;
            centerLng = lng;
            zoom = 17;
        } else {
            // Default/Interactive mode
            centerLat = props.defaultLat;
            centerLng = props.defaultLng;
            zoom = 15;
        }

        // Ensure center coordinates are numbers
        const centerLatNum =
            typeof centerLat === "string" ? parseFloat(centerLat) : centerLat;
        const centerLngNum =
            typeof centerLng === "string" ? parseFloat(centerLng) : centerLng;

        // Validate coordinates
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

        // Create map with explicit options
        map = L.map(mapContainer.value, {
            preferCanvas: false,
            zoomControl: true,
        });

        // Add tile layer first
        L.tileLayer(
            "  https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
            }
        ).addTo(map);

        // Force height immediately to ensure container has dimensions
        if (mapContainer.value) {
            mapContainer.value.style.minHeight = "300px";
            mapContainer.value.style.height = "300px";
        }

        // Wait for container to have proper dimensions before setting view
        // This is critical - Leaflet needs container dimensions to calculate tile positions correctly
        const setMapView = () => {
            if (map && mapContainer.value) {
                const rect = mapContainer.value.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 50) {
                    map.setView([centerLat, centerLng], zoom);
                    map.invalidateSize();
                    return true;
                }
            }
            return false;
        };

        // Try to set view, with one retry if needed
        if (!setMapView()) {
            setTimeout(() => {
                if (!setMapView() && map && mapContainer.value) {
                    // Final attempt - force height again and set view
                    mapContainer.value.style.minHeight = "300px";
                    mapContainer.value.style.height = "300px";
                    setTimeout(() => {
                        if (map) {
                            map.setView([centerLat, centerLng], zoom);
                            map.invalidateSize();
                        }
                    }, 50);
                }
            }, 100);
        }

        // Add markers based on mode
        if (isMultipleMode) {
            // Multiple markers
            const bounds = [];
            props.locations.forEach((location) => {
                if (location.latitude != null && location.longitude != null) {
                    const lat =
                        typeof location.latitude === "string"
                            ? parseFloat(location.latitude)
                            : location.latitude;
                    const lng =
                        typeof location.longitude === "string"
                            ? parseFloat(location.longitude)
                            : location.longitude;

                    if (!isNaN(lat) && !isNaN(lng)) {
                        bounds.push([lat, lng]);
                        // Use book link if book_slug exists, otherwise use page link
                        const url = location.book_slug
                            ? route("books.show", location.book_slug)
                            : location.id
                            ? route("pages.show", location.id)
                            : "#";
                        const popupContent = location.page_title
                            ? `<a href="${url}" class="text-blue-600 hover:text-blue-800 underline"><strong>${
                                  location.page_title
                              }</strong></a>${
                                  location.book_title
                                      ? `<br><em>${location.book_title}</em>`
                                      : ""
                              }`
                            : location.book_title
                            ? `<a href="${url}" class="text-blue-600 hover:text-blue-800 underline"><strong>${location.book_title}</strong></a>`
                            : `<a href="${url}" class="text-blue-600 hover:text-blue-800 underline">Location</a>`;

                        const marker = L.marker([lat, lng])
                            .addTo(map)
                            .bindPopup(popupContent);

                        markers.push(marker);
                    }
                }
            });

            // Fit bounds if multiple markers - use longer delay to ensure map is ready
            if (bounds.length > 1) {
                const latLngBounds = L.latLngBounds(bounds);
                // Use setTimeout to ensure map is fully initialized before fitting bounds
                setTimeout(() => {
                    if (map) {
                        try {
                            // First invalidate size
                            map.invalidateSize();
                            // Then fit bounds
                            map.fitBounds(latLngBounds, {
                                padding: [20, 20],
                                maxZoom: 15,
                            });
                            // Invalidate again after fitBounds
                            setTimeout(() => {
                                if (map) {
                                    map.invalidateSize();
                                }
                            }, 50);
                        } catch (error) {
                            // If fitBounds fails, try setting view to first marker
                            if (bounds.length > 0) {
                                map.setView(bounds[0], 13);
                                map.invalidateSize();
                            }
                        }
                    }
                }, 200);
            } else if (bounds.length === 1) {
                // Use setTimeout to ensure map is fully initialized before setting view
                setTimeout(() => {
                    if (map) {
                        try {
                            map.setView(bounds[0], 17);
                            map.invalidateSize();
                        } catch (error) {
                            // Fallback to default view
                            map.setView([centerLat, centerLng], zoom);
                            map.invalidateSize();
                        }
                    }
                }, 200);
            } else if (bounds.length === 0 && markers.length === 0) {
                // No valid markers, ensure map is still visible at default location
                setTimeout(() => {
                    if (map) {
                        map.setView([centerLat, centerLng], zoom);
                        map.invalidateSize();
                    }
                }, 200);
            } else if (bounds.length === 0 && markers.length > 0) {
                // Markers were added but bounds calculation failed, center on first marker
                setTimeout(() => {
                    if (map && markers.length > 0) {
                        const firstMarker = markers[0];
                        const markerLatLng = firstMarker.getLatLng();
                        map.setView(markerLatLng, 13);
                        map.invalidateSize();
                    }
                }, 200);
            }
        } else if (isSingleMode || (props.interactive && isSingleMode)) {
            // Single marker
            const popupContent = props.title
                ? `<strong>${props.title}</strong>${
                      props.bookTitle ? `<br><em>${props.bookTitle}</em>` : ""
                  }`
                : props.bookTitle
                ? `<strong>${props.bookTitle}</strong>`
                : "Location";

            const marker = L.marker([lat, lng]).addTo(map);

            // Fetch address for display above map (with small delay to ensure map is ready)
            setTimeout(() => {
                updateAddress(lat, lng);
            }, 100);

            if (!props.interactive) {
                marker.bindPopup(popupContent);
            }

            markers.push(marker);
        }

        // Add recenter button control (for both interactive and non-interactive modes when location exists)
        const hasLocation = (lat != null && lng != null) || markers.length > 0;
        if (hasLocation) {
            const recenterButton = L.control({ position: "bottomright" });
            recenterButton.onAdd = function () {
                const div = L.DomUtil.create("div", "leaflet-control-recenter");
                div.innerHTML = `
        <button
          type="button"
          class="leaflet-control-recenter-button"
          title="Recenter on marker"
          style="
            background-color: white;
            border: 2px solid rgba(0,0,0,0.2);
            border-radius: 4px;
            width: 30px;
            height: 30px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 5px rgba(0,0,0,0.4);
          "
        >
          <span style="font-size: 18px;">📍</span>
        </button>
      `;

                L.DomEvent.disableClickPropagation(div);
                L.DomEvent.on(div, "click", function () {
                    if (markers.length > 0) {
                        const marker = markers[0];
                        const latLng = marker.getLatLng();
                        map.setView(latLng, 17);
                    } else if (lat != null && lng != null) {
                        map.setView([lat, lng], 17);
                    }
                });

                return div;
            };
            recenterButton.addTo(map);
        }

        // Add geocoder control for interactive mode (address search)
        if (props.interactive && !props.hideGeocoder) {
            geocoderInstance = new Geocoder({
                defaultMarkGeocode: false,
                placeholder: "Search for an address...",
                errorMessage: "Nothing found.",
                position: "topright",
            });

            geocoderInstance.on("markgeocode", async (e) => {
                const { lat, lng } = e.geocode.center;

                // Remove existing marker
                markers.forEach((marker) => {
                    map.removeLayer(marker);
                });
                markers = [];

                // Fetch address for display above map
                await updateAddress(lat, lng);

                // Add new marker at geocoded location
                const marker = L.marker([lat, lng]).addTo(map);
                markers.push(marker);

                // Center map on geocoded location
                map.setView([lat, lng], 17);

                // Emit coordinates
                emit("update:latitude", lat);
                emit("update:longitude", lng);
                emit("location-selected", { lat, lng });
            });

            geocoderInstance.addTo(map);
        }

        // Add click handler for interactive mode
        if (props.interactive) {
            map.on("click", async (e) => {
                const { lat, lng } = e.latlng;

                // Remove existing marker
                markers.forEach((marker) => {
                    map.removeLayer(marker);
                });
                markers = [];

                // Fetch address for display above map
                await updateAddress(lat, lng);

                // Add new marker
                const marker = L.marker([lat, lng]).addTo(map);
                markers.push(marker);

                emit("update:latitude", lat);
                emit("update:longitude", lng);
                emit("location-selected", { lat, lng });
            });
        }

        // Invalidate size to ensure map renders correctly
        // Multiple attempts to handle aspect-square and dynamic sizing
        const invalidateMapSize = () => {
            if (map && mapContainer.value) {
                try {
                    map.invalidateSize();
                    // Trigger a resize event to force Leaflet to recalculate
                    window.dispatchEvent(new Event("resize"));
                } catch (error) {
                    // Silently handle errors
                }
            }
        };

        setTimeout(invalidateMapSize, 100);
        setTimeout(invalidateMapSize, 300);
        setTimeout(invalidateMapSize, 500);

        // Set up IntersectionObserver to detect when map becomes visible
        // This is important for maps inside accordions, tabs, or other collapsible containers
        if (mapContainer.value && typeof IntersectionObserver !== "undefined") {
            visibilityObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting && map) {
                            // Map container is now visible, invalidate size
                            setTimeout(() => {
                                if (map && mapContainer.value) {
                                    try {
                                        map.invalidateSize();
                                    } catch (error) {
                                        // Silently handle map size invalidation errors
                                    }
                                }
                            }, 100);
                        }
                    });
                },
                {
                    threshold: 0.1, // Trigger when at least 10% is visible
                }
            );
            visibilityObserver.observe(mapContainer.value);

            // If map is already visible when mounted, ensure it initializes properly
            // Check if element is already intersecting
            const isAlreadyVisible =
                mapContainer.value.offsetWidth > 0 &&
                mapContainer.value.offsetHeight > 0;
            if (isAlreadyVisible && map) {
                // Map is already visible, add additional invalidation attempts
                setTimeout(() => {
                    if (map && mapContainer.value) {
                        try {
                            map.invalidateSize();
                        } catch (error) {
                            // Silently handle map size invalidation errors
                        }
                    }
                }, 200);
                setTimeout(() => {
                    if (map && mapContainer.value) {
                        try {
                            map.invalidateSize();
                        } catch (error) {
                            // Silently handle map size invalidation errors
                        }
                    }
                }, 600);
            }
        }

        // Set up ResizeObserver to handle container size changes
        if (mapContainer.value && typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => {
                if (map && mapContainer.value) {
                    // Debounce the invalidation to avoid too many calls
                    setTimeout(() => {
                        if (map && mapContainer.value) {
                            try {
                                map.invalidateSize();
                            } catch (error) {
                                // Silently handle map size invalidation errors
                            }
                        }
                    }, 100);
                }
            });
            resizeObserver.observe(mapContainer.value);
        }

        // Final check: ensure map view is valid after all initialization
        setTimeout(() => {
            if (map) {
                try {
                    const currentCenter = map.getCenter();

                    // Validate that center is reasonable (not NaN or extreme values)
                    if (
                        isNaN(currentCenter.lat) ||
                        isNaN(currentCenter.lng) ||
                        Math.abs(currentCenter.lat) > 90 ||
                        Math.abs(currentCenter.lng) > 180
                    ) {
                        // Reset to default if view is invalid
                        map.setView([props.defaultLat, props.defaultLng], 13);
                        map.invalidateSize();
                    } else {
                        // Even if valid, force a refresh to ensure tiles load correctly
                        map.invalidateSize();
                    }

                    // Force a complete view refresh
                    const currentZoom = map.getZoom();
                    map.setView(map.getCenter(), currentZoom);
                    map.invalidateSize();
                } catch (error) {
                    // If error, try to reset to default
                    try {
                        map.setView([props.defaultLat, props.defaultLng], 13);
                        map.invalidateSize();
                    } catch (resetError) {
                        // Silently handle errors
                    }
                }
            }
        }, 400);

        isInitialized = true;
    } catch (error) {
        isInitialized = false;
    }
};

onMounted(() => {
    // Use a longer delay to ensure DOM is fully settled
    nextTick(() => {
        // If locations are already provided, initialize immediately
        // Otherwise, wait a bit for props to settle
        if (props.locations && props.locations.length > 0) {
            initializeMap();
        } else {
            setTimeout(() => {
                initializeMap();
            }, 50);
        }
    });
});

// Watch for changes in single location mode
watch(
    () => [props.latitude, props.longitude],
    ([newLat, newLng]) => {
        if (map && !props.locations?.length) {
            // Convert string props to numbers
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

            // Remove existing markers
            markers.forEach((marker) => {
                map.removeLayer(marker);
            });
            markers = [];

            if (lat != null && lng != null) {
                // Add new marker
                const popupContent = props.title
                    ? `<strong>${props.title}</strong>${
                          props.bookTitle
                              ? `<br><em>${props.bookTitle}</em>`
                              : ""
                      }`
                    : props.bookTitle
                    ? `<strong>${props.bookTitle}</strong>`
                    : "Location";

                const marker = L.marker([lat, lng])
                    .addTo(map)
                    .bindPopup(popupContent);

                // Fetch address for display above map (with small delay to ensure map is ready)
                setTimeout(() => {
                    updateAddress(lat, lng);
                }, 100);

                markers.push(marker);

                if (!props.interactive) {
                    map.setView([lat, lng], 17);
                } else {
                    map.setView([lat, lng], 15);
                }
            }
        }
    }
);

// Watch for changes in multiple locations mode
watch(
    () => props.locations,
    (newLocations) => {
        // If locations are provided and map isn't initialized yet, initialize it
        if (!isInitialized && newLocations && newLocations.length > 0) {
            nextTick(() => {
                initializeMap();
            });
            return;
        }

        // If map is already initialized, reinitialize with new locations
        if (isInitialized) {
            nextTick(() => {
                initializeMap();
            });
        }
    },
    { deep: true, immediate: true }
);

onUnmounted(() => {
    if (visibilityObserver) {
        visibilityObserver.disconnect();
        visibilityObserver = null;
    }
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }
    if (map) {
        map.remove();
    }
});
</script>
