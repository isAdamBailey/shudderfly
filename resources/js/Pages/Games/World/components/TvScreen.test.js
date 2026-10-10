import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TvScreen from "./TvScreen.vue";

vi.mock("@/composables/useTranslations", () => ({
    useTranslations: () => ({
        t: (key, { number }) => `${key} ${number}`,
    }),
}));

const channel = {
    id: 4,
    video: "https://cdn.test/bath.mp4",
    poster: "https://cdn.test/bath.jpg",
    title: "Bath Time",
};

let play;

beforeEach(() => {
    vi.useFakeTimers();
    play = vi
        .spyOn(HTMLMediaElement.prototype, "play")
        .mockResolvedValue(undefined);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe("TvScreen", () => {
    it("waits while the room is paused, then plays on", async () => {
        const pause = vi
            .spyOn(HTMLMediaElement.prototype, "pause")
            .mockImplementation(() => {});
        const wrapper = mount(TvScreen, {
            props: { channel, number: 1, paused: true },
        });
        expect(play).not.toHaveBeenCalled();

        await wrapper.setProps({ paused: false });
        expect(play).toHaveBeenCalledOnce();

        await wrapper.setProps({ paused: true });
        expect(pause).toHaveBeenCalled();
        wrapper.unmount();
    });

    it("plays the channel's video, showing its number for a moment", async () => {
        const wrapper = mount(TvScreen, { props: { channel, number: 2 } });
        const video = wrapper.get("video");

        expect(video.attributes("src")).toBe(channel.video);
        expect(video.attributes("poster")).toBe(channel.poster);
        expect(play).toHaveBeenCalled();
        expect(wrapper.get(".tv-screen-channel").text()).toBe(
            "games.world.tv_channel 2"
        );

        vi.advanceTimersByTime(2000);
        await wrapper.vm.$nextTick();
        expect(wrapper.find(".tv-screen-channel").exists()).toBe(false);
    });

    it("stays unmuted when a pause cuts its start short", async () => {
        vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
            () => {}
        );
        let reject;
        play.mockReturnValueOnce(new Promise((_, no) => (reject = no)));
        const wrapper = mount(TvScreen, { props: { channel, number: 1 } });

        await wrapper.setProps({ paused: true });
        reject(new DOMException("aborted", "AbortError"));
        await flushPromises();

        expect(wrapper.get("video").element.muted).toBe(false);
        expect(play).toHaveBeenCalledOnce();
        wrapper.unmount();
    });

    it("plays muted when the browser won't play it with sound", async () => {
        play.mockRejectedValueOnce(new Error("NotAllowedError"));
        const wrapper = mount(TvScreen, { props: { channel, number: 1 } });

        await flushPromises();

        expect(wrapper.get("video").element.muted).toBe(true);
        expect(play).toHaveBeenCalledTimes(2);
    });

    it("says when its video ends", async () => {
        const wrapper = mount(TvScreen, { props: { channel, number: 1 } });

        await wrapper.get("video").trigger("ended");

        expect(wrapper.emitted("ended")).toHaveLength(1);
    });
});
