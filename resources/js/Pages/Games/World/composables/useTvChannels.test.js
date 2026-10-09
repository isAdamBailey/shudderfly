import { describe, expect, it } from "vitest";
import { useTvChannels } from "./useTvChannels.js";

const channels = [{ id: 4 }, { id: 9 }];
const tv = { id: "tv", type: "tv", channels };
const blank = { id: "blank", type: "tv", channels: [] };
const lamp = { id: "lamp", type: "toy" };

describe("useTvChannels", () => {
    it("is off until used, then goes through each channel and off again", () => {
        const tvs = useTvChannels([tv, lamp]);

        expect(tvs.channelOf(tv)).toBeNull();
        tvs.changeChannel("tv");
        expect(tvs.channelOf(tv)).toEqual({ channel: channels[0], number: 1 });
        tvs.changeChannel("tv");
        expect(tvs.channelOf(tv)).toEqual({ channel: channels[1], number: 2 });
        tvs.changeChannel("tv");
        expect(tvs.channelOf(tv)).toBeNull();
    });

    it("goes round to the first channel when the last one's video ends", () => {
        const tvs = useTvChannels([tv]);

        tvs.changeChannel("tv");
        tvs.changeChannel("tv", { wrap: true });
        tvs.changeChannel("tv", { wrap: true });

        expect(tvs.channelOf(tv)).toEqual({ channel: channels[0], number: 1 });
    });

    it("leaves alone a TV with nothing on, and anything that isn't a TV", () => {
        const tvs = useTvChannels([blank, lamp]);

        tvs.changeChannel("blank");
        tvs.changeChannel("lamp");
        tvs.changeChannel("nowhere");

        expect(tvs.channelOf(blank)).toBeNull();
        expect(tvs.channelOf(lamp)).toBeNull();
    });
});
