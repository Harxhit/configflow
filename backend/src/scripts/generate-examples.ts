import { encode } from "@msgpack/msgpack";
import fs from "node:fs";
import path from "node:path";

type Slot = {
  id: string;
  position: { x: number; y: number; width: number; height: number };
  interaction: string | null;
  tags: string[];
};

type Config = {
  uuid: string;
  fps: number;
  length: number;
  name: string;
  version: number;
  slots: Slot[];
};

// Every example points at the video you already have, so the player works.
// Change this if you add more videos to storage/videos/.
const VIDEO_UUID = "a81f2c9e-4d71-4f20-9b31-8c42d7e5a610";

const OUTPUT_DIR = path.resolve(process.cwd(), "storage", "msgpack");

const examples: Record<string, Config> = {
  // Empty array edge case.
  "example-empty-slots": {
    uuid: VIDEO_UUID,
    fps: 30,
    length: 124,
    name: "empty-slots",
    version: 1,
    slots: [],
  },

  // Null interaction edge case, single slot.
  "example-null-interaction": {
    uuid: VIDEO_UUID,
    fps: 24,
    length: 60,
    name: "null-interaction",
    version: 1,
    slots: [
      {
        id: "slot-001",
        position: { x: 0, y: 0, width: 1280, height: 720 },
        interaction: null,
        tags: ["fullscreen"],
      },
    ],
  },

  // Several slots, mixed interactions, several tags, decimal values.
  "example-multiple-slots": {
    uuid: VIDEO_UUID,
    fps: 29.97,
    length: 175.5,
    name: "multiple-slots",
    version: 3,
    slots: [
      {
        id: "slot-001",
        position: { x: 100, y: 60, width: 400, height: 225 },
        interaction: "click",
        tags: ["product", "hero", "intro"],
      },
      {
        id: "slot-002",
        position: { x: 640.5, y: 120.25, width: 320, height: 180 },
        interaction: "hover",
        tags: ["secondary"],
      },
      {
        id: "slot-003",
        position: { x: 200, y: 400, width: 800, height: 120 },
        interaction: null,
        tags: ["caption", "subtitle"],
      },
    ],
  },

  // Unicode and long text.
  "example-unicode": {
    uuid: VIDEO_UUID,
    fps: 60,
    length: 12,
    name: "Démo – 製品デモ",
    version: 2,
    slots: [
      {
        id: "スロット-1",
        position: { x: 50, y: 50, width: 300, height: 200 },
        interaction: "tap",
        tags: ["日本語", "émoji-🙂", "a-very-long-tag-name-to-check-wrapping-in-the-editor"],
      },
    ],
  },
};

// Same rules as the UI: id non-empty, finite numbers, width/height > 0,
// interaction string or null, at least one non-empty tag.
const assertValid = (name: string, config: Config) => {
  const fail = (message: string) => {
    throw new Error(`${name}: ${message}`);
  };

  if (!config.uuid || !config.name) fail("uuid and name are required");
  if (!Number.isInteger(config.version)) fail("version must be an integer");
  if (!Number.isFinite(config.fps) || !Number.isFinite(config.length)) {
    fail("fps and length must be numbers");
  }

  const ids = new Set<string>();
  config.slots.forEach((slot) => {
    if (!slot.id.trim()) fail("slot id is empty");
    if (ids.has(slot.id)) fail(`duplicate slot id ${slot.id}`);
    ids.add(slot.id);

    const { x, y, width, height } = slot.position;
    if (![x, y, width, height].every(Number.isFinite)) {
      fail(`slot ${slot.id} has a non-numeric position`);
    }
    if (width <= 0 || height <= 0) fail(`slot ${slot.id} has no size`);
    if (slot.interaction !== null && !slot.interaction.trim()) {
      fail(`slot ${slot.id} has an empty interaction`);
    }
    if (slot.tags.length === 0 || slot.tags.some((tag) => !tag.trim())) {
      fail(`slot ${slot.id} needs non-empty tags`);
    }
  });
};

const write = (fileName: string, bytes: Uint8Array) => {
  fs.writeFileSync(path.join(OUTPUT_DIR, `${fileName}.msgpack`), bytes);
  console.log(`wrote storage/msgpack/${fileName}.msgpack`);
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const [fileName, config] of Object.entries(examples)) {
  assertValid(fileName, config);
  write(fileName, encode(config));
}

if (process.argv.includes("--invalid")) {
  // Valid msgpack, but the structure is wrong (missing fields, wrong types).
  write(
    "invalid-missing-fields",
    encode({ uuid: VIDEO_UUID, name: "missing-fields" })
  );
  write(
    "invalid-wrong-types",
    encode({
      uuid: VIDEO_UUID,
      fps: "thirty",
      length: 10,
      name: "wrong-types",
      version: 1.5,
      slots: [{ id: "", position: { x: "a" }, interaction: 5, tags: [] }],
    })
  );

  // Not decodable at all: a valid file cut in half.
  const whole = encode(examples["example-multiple-slots"]);
  write("invalid-truncated", whole.slice(0, Math.floor(whole.length / 2)));

  // Random bytes that are not msgpack of the expected shape.
  write("invalid-garbage", Uint8Array.from([0xc1, 0xff, 0x00, 0x13, 0x37]));
}