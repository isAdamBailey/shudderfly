export const FEATURES = {
    SNAPSHOTS_ENABLED: true
};

export function useFeatureFlags() {
    return {
        isSnapshotsEnabled: FEATURES.SNAPSHOTS_ENABLED
    };
} 