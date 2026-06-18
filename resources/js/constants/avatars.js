import { createAvatar } from "@dicebear/core";
import * as funEmoji from "@dicebear/fun-emoji";
import * as bigEarsNeutral from "@dicebear/big-ears-neutral";
import * as avataaarsNeutral from "@dicebear/avataaars-neutral";
import * as adventurerNeutral from "@dicebear/adventurer-neutral";

const avatarCountPerStyle = 12;

// Each style keeps its own id prefix so existing saved avatars (avatar-N)
// stay valid, and new styles get their own stable ids.
const styles = [
  { key: "avatar", label: "Avatar", collection: funEmoji },
  { key: "bigears", label: "Big Ears", collection: bigEarsNeutral },
  { key: "avataaars", label: "Avataaars", collection: avataaarsNeutral },
  { key: "adventurer", label: "Adventurer", collection: adventurerNeutral }
];

function generateAvatarSvg(collection, seed, size = 100) {
  const avatar = createAvatar(collection, {
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

export const avatars = styles.flatMap((style) =>
  Array.from({ length: avatarCountPerStyle }, (_, i) => {
    const n = i + 1;
    return {
      id: `${style.key}-${n}`,
      name: `${style.label} ${n}`,
      svg: generateAvatarSvg(style.collection, `${style.key}-seed-${n}`, 100)
    };
  })
);

export function getAvatarById(id) {
  return avatars.find((avatar) => avatar.id === id);
}
