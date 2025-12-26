import { createAvatar } from "@dicebear/core";
import * as funEmoji from "@dicebear/fun-emoji";

const avatarCount = 12;

function generateAvatarSvg(seed, size = 100) {
  const avatar = createAvatar(funEmoji, {
    seed: seed,
    size: size
  });

  let svg = avatar.toString();

  if (svg.includes("viewBox") && !svg.includes("width=")) {
    svg = svg.replace(
      /<svg([^>]*)>/,
      `<svg$1 width="${size}" height="${size}">`
    );
  }

  return svg;
}

export const avatars = Array.from({ length: avatarCount }, (_, i) => {
  const id = `avatar-${i + 1}`;
  return {
    id: id,
    name: `Avatar ${i + 1}`,
    svg: generateAvatarSvg(`avatar-seed-${i + 1}`, 100)
  };
});

export function getAvatarById(id) {
  return avatars.find((avatar) => avatar.id === id);
}
