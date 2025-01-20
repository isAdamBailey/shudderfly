export const FEATURES = {
    SNAPSHOTS_ENABLED: false
};

export function useFeatureFlags() {
    return {
        isSnapshotsEnabled: FEATURES.SNAPSHOTS_ENABLED
    };
} 