import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/api";

type Slot = {
  id: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  interaction: string | null;
  tags: string[];
};

type createSlot = {
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  interaction: string | null;
  tags: string[];
}

type Config = {
  uuid: string;
  fps: number;
  length: number;
  name: string;
  version: number;
  slots: Slot[];
};

type PathPart = string | number;
type DataPath = PathPart[];

type ConfigUpdate = {
  path: DataPath;
  value: unknown;
};

type Change = {
  label: string;
  before: string;
  after: string;
  kind: "changed" | "added" | "removed";
};
const REFERENCE_FRAME = { w: 1280, h: 720 };


const videoUrlFor = (uuid: string) =>
  `${api.defaults.baseURL ?? ""}/config/video/${encodeURIComponent(uuid)}`;

const thumbUrlFor = (uuid: string) =>
  `${api.defaults.baseURL ?? ""}/config/thumb/${encodeURIComponent(uuid)}`;


const inputClass =
  "w-full border-b border-neutral-800 bg-transparent px-0 py-3 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-white";

const labelClass =
  "mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500";

const ghostButton =
  "border border-white/10 px-3 py-2 text-xs text-neutral-400 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

const cloneValue = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(cloneValue) as T;
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)])
    ) as T;
  }

  return value;
};

const updateAtPath = (
  current: unknown,
  path: DataPath,
  newValue: unknown
): unknown => {
  if (path.length === 0) return newValue;

  const [key, ...remaining] = path;

  if (Array.isArray(current)) {
    const next = [...current];
    const index = key as number;

    next[index] = updateAtPath(next[index], remaining, newValue);

    return next;
  }

  if (typeof current === "object" && current !== null) {
    const object = current as Record<string, unknown>;

    return {
      ...object,
      [key]: updateAtPath(object[key as string], remaining, newValue),
    };
  }

  return current;
};

const buildUpdates = (
  original: unknown,
  current: unknown,
  path: DataPath = []
): ConfigUpdate[] => {
  if (JSON.stringify(original) === JSON.stringify(current)) {
    return [];
  }

  if (Array.isArray(original) && Array.isArray(current)) {
    if (original.length !== current.length) {
      return [{ path, value: current }];
    }

    return current.flatMap((item, index) =>
      buildUpdates(original[index], item, [...path, index])
    );
  }

  if (
    typeof original === "object" &&
    original !== null &&
    typeof current === "object" &&
    current !== null &&
    !Array.isArray(original) &&
    !Array.isArray(current)
  ) {
    const originalObject = original as Record<string, unknown>;
    const currentObject = current as Record<string, unknown>;

    const originalKeys = Object.keys(originalObject).sort();
    const currentKeys = Object.keys(currentObject).sort();

    if (JSON.stringify(originalKeys) !== JSON.stringify(currentKeys)) {
      return [{ path, value: current }];
    }

    return Object.keys(originalObject).flatMap((key) =>
      buildUpdates(originalObject[key], currentObject[key], [...path, key])
    );
  }

  return [{ path, value: current }];
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "—";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

// Schema rules: id non-empty, numbers finite, tags non-empty strings,
// interaction is a non-empty string or null.
const validateSlot = (slot: Slot, label: string): string[] => {
  const errors: string[] = [];

  if (!slot.id.trim()) errors.push(`${label}: ID is required.`);

  (["x", "y", "width", "height"] as const).forEach((key) => {
    if (!Number.isFinite(slot.position[key])) {
      errors.push(`${label}: ${key} must be a number.`);
    }
  });

  if (slot.position.width <= 0 || slot.position.height <= 0) {
    errors.push(`${label}: width and height must be greater than 0.`);
  }

  if (slot.interaction !== null && !slot.interaction.trim()) {
    errors.push(`${label}: interaction must be text or null.`);
  }

  if (slot.tags.length === 0) {
    errors.push(`${label}: at least one tag is required.`);
  } else if (slot.tags.some((tag) => !tag.trim())) {
    errors.push(`${label}: tags cannot be empty.`);
  }

  return errors;
};

const show = (value: unknown) =>
  value === null
    ? "null"
    : typeof value === "string"
    ? `"${value}"`
    : JSON.stringify(value);

// Slots are matched by id, so editing an id shows up as one removed + one added.
const diffConfigs = (a: Config, b: Config): Change[] => {
  const out: Change[] = [];

  (["name", "uuid", "fps", "length", "version"] as const).forEach((key) => {
    if (a[key] !== b[key]) {
      out.push({
        label: key,
        before: show(a[key]),
        after: show(b[key]),
        kind: "changed",
      });
    }
  });

  const beforeSlots = new Map(a.slots.map((slot) => [slot.id, slot]));
  const afterSlots = new Map(b.slots.map((slot) => [slot.id, slot]));

  beforeSlots.forEach((slot, id) => {
    if (!afterSlots.has(id)) {
      out.push({
        label: `slot ${id}`,
        before: JSON.stringify(slot),
        after: "",
        kind: "removed",
      });
    }
  });

  afterSlots.forEach((slot, id) => {
    const old = beforeSlots.get(id);

    if (!old) {
      out.push({
        label: `slot ${id}`,
        before: "",
        after: JSON.stringify(slot),
        kind: "added",
      });
      return;
    }

    (["x", "y", "width", "height"] as const).forEach((key) => {
      if (old.position[key] !== slot.position[key]) {
        out.push({
          label: `slot ${id} · ${key}`,
          before: show(old.position[key]),
          after: show(slot.position[key]),
          kind: "changed",
        });
      }
    });

    if (old.interaction !== slot.interaction) {
      out.push({
        label: `slot ${id} · interaction`,
        before: show(old.interaction),
        after: show(slot.interaction),
        kind: "changed",
      });
    }

    if (JSON.stringify(old.tags) !== JSON.stringify(slot.tags)) {
      out.push({
        label: `slot ${id} · tags`,
        before: show(old.tags),
        after: show(slot.tags),
        kind: "changed",
      });
    }
  });

  return out;
};

const SectionHeading = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) => (
  <div>
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
      {eyebrow}
    </p>

    <h2 className="mt-2 text-xl font-medium tracking-[-0.04em] text-white">
      {title}
    </h2>

    {description && (
      <p className="mt-2 text-sm text-neutral-500">{description}</p>
    )}
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  type?: "text" | "number";
  disabled?: boolean;
}) => (
  <div className="min-w-0">
    <label className={labelClass}>{label}</label>

    <input
      type={type}
      disabled={disabled}
      className={`${inputClass} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
      value={value}
      onChange={(event) => {
        const nextValue =
          type === "number"
            ? event.target.value === ""
              ? 0
              : Number(event.target.value)
            : event.target.value;

        onChange(nextValue);
      }}
    />
  </div>
);

type SlotDraft = {
  id: string;
  x: string;
  y: string;
  width: string;
  height: string;
  interaction: string;
  hasInteraction: boolean;
  tags: string[];
};

const emptyDraft = (): SlotDraft => ({
  id: "",
  x: "0",
  y: "0",
  width: "100",
  height: "100",
  interaction: "",
  hasInteraction: false,
  tags: [""],
});

const AddSlotModal = ({
  existingIds,
  onClose,
  onCreate,
}: {
  existingIds: string[];
  onClose: () => void;
  onCreate: (slot: createSlot) => Promise<void>;
}) => {
  const [draft, setDraft] = useState<SlotDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const patch = (changes: Partial<SlotDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const numeric = (value: string) =>
    value.trim() === "" ? NaN : Number(value);

  const errors = useMemo(() => {
    const list: Record<string, string> = {};

    (["x", "y", "width", "height"] as const).forEach((key) => {
      if (!Number.isFinite(numeric(draft[key]))) {
        list[key] = "Enter a number.";
      }
    });

    if (!list.width && numeric(draft.width) <= 0) {
      list.width = "Must be greater than 0.";
    }
    if (!list.height && numeric(draft.height) <= 0) {
      list.height = "Must be greater than 0.";
    }

    if (draft.hasInteraction && !draft.interaction.trim()) {
      list.interaction = "Enter a value or choose no interaction.";
    }

    if (draft.tags.some((tag) => !tag.trim())) {
      list.tags = "Every tag needs a value.";
    }

    return list;
  }, [draft, existingIds]);

  const hasErrors = Object.keys(errors).length > 0;

  const submit = async () => {
    setSubmitted(true);
    if (hasErrors || submitting) return;

    try {
      setSubmitting(true);
      setApiError("");

      await onCreate({
        position: {
          x: Number(draft.x),
          y: Number(draft.y),
          width: Number(draft.width),
          height: Number(draft.height),
        },
        interaction: draft.hasInteraction ? draft.interaction.trim() : null,
        tags: draft.tags.map((tag) => tag.trim()),
      });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(
        e.response?.data?.message ||
          (err instanceof Error ? err.message : "Failed to add slot")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const showError = (key: string) =>
    submitted && errors[key] ? (
      <p className="mt-2 text-[11px] text-red-400">{errors[key]}</p>
    ) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add slot"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col border border-white/[0.08] bg-[#101010]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-white/[0.08] px-7 py-6">
          <SectionHeading
            eyebrow="NEW / SLOT"
            title="Add slot"
            description="Define a rectangular region on the video frame."
          />

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="px-2 text-xl text-neutral-500 transition hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="space-y-9 overflow-y-auto px-7 py-7">
          <div>
            <label className={labelClass}>Slot ID (required)</label>
          </div>

          <div>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-200">Position</p>
              <span className="font-mono text-[10px] text-neutral-600">
                X / Y / W / H
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
              {(["x", "y", "width", "height"] as const).map((key) => (
                <div key={key} className="min-w-0">
                  <label className={labelClass}>{key}</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={draft[key]}
                    onChange={(event) => patch({ [key]: event.target.value })}
                  />
                  {showError(key)}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-neutral-200">
                Interaction
              </p>

              <div className="flex border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => patch({ hasInteraction: false })}
                  className={`px-3 py-2 transition ${
                    !draft.hasInteraction
                      ? "bg-white text-black"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  None (null)
                </button>
                <button
                  type="button"
                  onClick={() => patch({ hasInteraction: true })}
                  className={`px-3 py-2 transition ${
                    draft.hasInteraction
                      ? "bg-white text-black"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Set value
                </button>
              </div>
            </div>

            <input
              className={`${inputClass} ${
                !draft.hasInteraction ? "cursor-not-allowed opacity-40" : ""
              }`}
              disabled={!draft.hasInteraction}
              placeholder={
                draft.hasInteraction
                  ? "e.g. click, hover"
                  : "Saved as null — no interaction"
              }
              value={draft.interaction}
              onChange={(event) => patch({ interaction: event.target.value })}
            />
            {showError("interaction")}
          </div>

          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-200">Tags</p>
                <p className="mt-1 text-xs text-neutral-500">
                  At least one tag, and no empty values.
                </p>
              </div>

              <button
                type="button"
                className={ghostButton}
                onClick={() => patch({ tags: [...draft.tags, ""] })}
              >
                + Add tag
              </button>
            </div>

            <div className="space-y-4">
              {draft.tags.map((tag, tagIndex) => (
                <div key={tagIndex} className="flex items-center gap-4">
                  <span className="w-5 shrink-0 font-mono text-[10px] text-neutral-600">
                    {String(tagIndex + 1).padStart(2, "0")}
                  </span>

                  <input
                    className={inputClass}
                    placeholder="Tag value"
                    value={tag}
                    onChange={(event) =>
                      patch({
                        tags: draft.tags.map((item, i) =>
                          i === tagIndex ? event.target.value : item
                        ),
                      })
                    }
                  />

                  <button
                    type="button"
                    disabled={draft.tags.length <= 1}
                    aria-label={`Remove tag ${tagIndex + 1}`}
                    onClick={() =>
                      patch({
                        tags: draft.tags.filter((_, i) => i !== tagIndex),
                      })
                    }
                    className="shrink-0 px-2 py-2 text-sm text-neutral-500 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {showError("tags")}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] px-7 py-5">
          {apiError && (
            <p className="mr-auto text-[11px] text-red-400">{apiError}</p>
          )}
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className={ghostButton}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="bg-white px-5 py-3 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {submitting ? "Creating..." : "Create slot"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReviewModal = ({
  changes,
  saving,
  onCancel,
  onConfirm,
}: {
  changes: Change[];
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
    onClick={saving ? undefined : onCancel}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Review changes"
      className="flex max-h-[92vh] w-full max-w-3xl flex-col border border-white/[0.08] bg-[#101010]"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="border-b border-white/[0.08] px-7 py-6">
        <SectionHeading
          eyebrow="REVIEW / DIFF"
          title="Review changes"
          description={`${changes.length} ${
            changes.length === 1 ? "change" : "changes"
          } will be written to the MessagePack file.`}
        />
      </div>

      <div className="divide-y divide-white/[0.06] overflow-y-auto px-7">
        {changes.length === 0 && (
          <p className="py-6 text-xs text-neutral-500">
            No field-level differences. Only the slot order changed.
          </p>
        )}

        {changes.map((change, i) => (
          <div key={i} className="py-4">
            <div className="mb-2 flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                {change.kind}
              </span>
              <span className="break-all text-xs text-neutral-300">
                {change.label}
              </span>
            </div>

            {change.before && (
              <pre className="overflow-x-auto whitespace-pre-wrap break-all border-l-2 border-red-500/60 bg-red-500/[0.06] px-3 py-1.5 font-mono text-[11px] text-neutral-400">
                − {change.before}
              </pre>
            )}
            {change.after && (
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all border-l-2 border-white/70 bg-white/[0.05] px-3 py-1.5 font-mono text-[11px] text-neutral-200">
                + {change.after}
              </pre>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 border-t border-white/[0.08] px-7 py-5">
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className={ghostButton}
        >
          Back to editing
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onConfirm}
          className="bg-white px-5 py-3 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {saving ? "Saving..." : "Confirm and save"}
        </button>
      </div>
    </div>
  </div>
);

const ConfigDetail = () => {
  const { fileName } = useParams<{ fileName: string }>();

  const [data, setData] = useState<Config | null>(null);
  const [originalData, setOriginalData] = useState<Config | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [jsonOpen, setJsonOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [addSlotOpen, setAddSlotOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [videoSize, setVideoSize] = useState<{ w: number; h: number } | null>(
    null
  );
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        if (!fileName) {
          throw new Error("Filename is missing");
        }

        setLoading(true);
        setError("");

        const response = await api.get(
          `/config/${encodeURIComponent(fileName)}`
        );

        if (!response.data.success) {
          throw new Error(response.data.message || "Failed to load file");
        }

        const decoded = response.data.decodedFile as Config;

        if (decoded === undefined) {
          throw new Error("Decoded data is missing");
        }

        setData(cloneValue(decoded));
        setOriginalData(cloneValue(decoded));
      } catch (err) {
        console.error("Configuration fetch failed:", err);
        setError("Unable to load this MessagePack file.");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [fileName]);

  // New saved uuid means a different video, so clear the old failure state.
  const videoUuid = originalData?.uuid;
  useEffect(() => {
    setVideoFailed(false);
    setVideoSize(null);
  }, [videoUuid]);

  useEffect(() => {
    if (!addSlotOpen && !reviewOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setAddSlotOpen(false);
      if (!saving) setReviewOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addSlotOpen, reviewOpen, saving]);

  const jsonValue = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2) ?? "undefined";
    } catch {
      return "Unable to represent this value as JSON.";
    }
  }, [data]);

  const isDirty = useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(originalData);
  }, [data, originalData]);

  const validationErrors = useMemo(() => {
    if (!data) return [];

    const list = data.slots.flatMap((slot, index) =>
      validateSlot(slot, `Slot ${index + 1}`)
    );

    const seen = new Set<string>();
    data.slots.forEach((slot, index) => {
      const id = slot.id.trim();
      if (!id) return;
      if (seen.has(id)) list.push(`Slot ${index + 1}: ID "${id}" is duplicated.`);
      seen.add(id);
    });

    return list;
  }, [data]);

  const changes = useMemo(
    () => (data && originalData ? diffConfigs(originalData, data) : []),
    [data, originalData]
  );

  const clearMessages = () => {
    setSaveMessage("");
    setSaveError("");
  };

  const updateValue = (path: DataPath, value: unknown) => {
    setData((current) => {
      if (!current) return current;

      return updateAtPath(current, path, value) as Config;
    });

    clearMessages();
  };

  const createSlot = async (slot: createSlot) => {
    if (!fileName) return;
    const response = await api.post(
      `/config/slot/${encodeURIComponent(fileName)}`,
      { slot }
    );
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to add slot");
    }

    const createdSlot = response.data.slot
    setData((current) => current ? {...current, slots: [...current.slots, createdSlot]}: current);
    setOriginalData((current) => current ? {...current, slots: [...current.slots, createdSlot]}: current);
    setAddSlotOpen(false);
    setSaveMessage("Slot added.");
    return;
  };

  const removeSlot = (index: number) => {
    if (!data) return;

    setData({
      ...data,
      slots: data.slots.filter((_, slotIndex) => slotIndex !== index),
    });
    setCollapsed(new Set());
    clearMessages();
  };

  const toggleCollapsed = (index: number) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addTag = (slotIndex: number) => {
    if (!data) return;

    const slots = [...data.slots];

    slots[slotIndex] = {
      ...slots[slotIndex],
      tags: [...slots[slotIndex].tags, ""],
    };

    setData({ ...data, slots });
    clearMessages();
  };

  const removeTag = (slotIndex: number, tagIndex: number) => {
    if (!data || data.slots[slotIndex].tags.length <= 1) return;

    const slots = [...data.slots];

    slots[slotIndex] = {
      ...slots[slotIndex],
      tags: slots[slotIndex].tags.filter((_, index) => index !== tagIndex),
    };

    setData({ ...data, slots });
    clearMessages();
  };

  const saveChanges = async () => {
    if (
      !fileName ||
      !data ||
      !originalData ||
      !isDirty ||
      saving ||
      validationErrors.length > 0
    ) {
      return;
    }

    try {
      setSaving(true);
      setSaveError("");
      setSaveMessage("");

      const updates = buildUpdates(originalData, data);

      if (updates.length === 0) return;

      const response = await api.patch(
        `/config/${encodeURIComponent(fileName)}`,
        { updates }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to save configuration"
        );
      }

      const savedData = response.data.data as Config;

      setData(cloneValue(savedData));
      setOriginalData(cloneValue(savedData));
      setSaveMessage("Changes saved successfully.");
    } catch (err: unknown) {
      console.error("Configuration save failed:", err);

      const errorResponse = err as {
        response?: {
          data?: {
            message?: string;
          };
        };
      };

      const message =
        errorResponse.response?.data?.message ||
        (err instanceof Error
          ? err.message
          : "Failed to save configuration");

      setSaveError(message);
    } finally {
      setSaving(false);
      setReviewOpen(false);
    }
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonValue);
      setCopied(true);

      window.setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const discardChanges = () => {
    setData(cloneValue(originalData));
    clearMessages();
  };

  const canSave = isDirty && !saving && validationErrors.length === 0;

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080808] text-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white" />

          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            Loading configuration
          </p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080808] px-5 text-white">
        <div className="max-w-md border border-white/[0.08] bg-[#101010] p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center border border-red-500/30 text-xl text-red-400">
            !
          </div>

          <h2 className="mt-5 text-lg font-medium">
            Unable to open configuration
          </h2>

          <p className="mt-2 text-sm text-neutral-500">
            {error || "The configuration data could not be loaded."}
          </p>

          <Link
            to="/dashboard"
            className="mt-6 inline-flex bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-200"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-6 sm:px-10 lg:px-16">
          <div className="flex min-w-0 items-center gap-5">
            <Link
              to="/dashboard"
              className="shrink-0 text-2xl font-semibold tracking-[-0.08em]"
            >
              config<span className="text-neutral-500">flow</span>.
            </Link>

            <div className="hidden h-6 w-px bg-white/10 sm:block" />

            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-xs text-neutral-300">{fileName}</p>

              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-600">
                Configuration workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 font-mono text-[10px] text-neutral-500 sm:flex">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isDirty ? "bg-white" : "bg-neutral-600"
                }`}
              />
              {isDirty ? "UNSAVED CHANGES" : "ALL CHANGES SAVED"}
            </span>

            <Link
              to="/dashboard"
              className="border border-white/10 px-3.5 py-2 text-xs text-neutral-400 transition hover:border-white/30 hover:text-white"
            >
              Exit editor
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-6 pb-32 pt-10 sm:px-10 lg:px-16">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-600">
              <Link to="/dashboard" className="transition hover:text-white">
                Workspace
              </Link>

              <span>/</span>

              <span className="text-neutral-300">Configuration editor</span>
            </div>

            <h1 className="mt-5 break-all text-4xl font-medium tracking-[-0.065em] sm:text-5xl">
              {data.name || fileName}
            </h1>

            <p className="mt-3 text-sm text-neutral-500">
              Edit configuration values and manage video slots.
            </p>

            <p className="mt-2 break-all font-mono text-[10px] text-neutral-600">
              {fileName}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setJsonOpen(!jsonOpen)}
              className={`border px-4 py-3 text-xs transition ${
                jsonOpen
                  ? "border-white bg-white text-black"
                  : "border-white/10 text-neutral-400 hover:border-white/40 hover:text-white"
              }`}
            >
              {jsonOpen ? "Hide JSON" : "Inspect JSON"}
            </button>

            <button
              type="button"
              disabled={!isDirty || saving}
              onClick={discardChanges}
              className="border border-white/10 px-4 py-3 text-xs text-neutral-400 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Reset
            </button>

            <button
              type="button"
              disabled={!canSave}
              onClick={() => setReviewOpen(true)}
              className="bg-white px-5 py-3 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-0 border-y border-white/[0.08] sm:grid-cols-4">
          <div className="border-b border-r border-white/[0.08] p-5 sm:border-b-0">
            <p className={labelClass}>Frame rate</p>
            <p className="text-3xl font-medium tracking-tight">
              {data.fps}
              <span className="ml-2 text-xs font-normal text-neutral-500">
                FPS
              </span>
            </p>
          </div>

          <div className="border-b border-white/[0.08] p-5 sm:border-b-0 sm:border-r">
            <p className={labelClass}>Duration</p>
            <p className="text-3xl font-medium tracking-tight">
              {formatDuration(data.length)}
            </p>
          </div>

          <div className="border-r border-white/[0.08] p-5">
            <p className={labelClass}>Total slots</p>
            <p className="text-3xl font-medium tracking-tight">
              {data.slots.length}
            </p>
          </div>

          <div className="p-5">
            <p className={labelClass}>Version</p>
            <p className="text-3xl font-medium tracking-tight">
              v{data.version}
            </p>
          </div>
        </div>

        {saveError && (
          <div className="mt-6 flex items-start gap-3 border-l-2 border-red-500 px-4 py-3">
            <span className="text-sm text-red-400">!</span>
            <div>
              <p className="text-sm font-medium text-red-300">
                Unable to save changes
              </p>
              <p className="mt-1 text-xs text-neutral-400">{saveError}</p>
            </div>
          </div>
        )}

        {saveMessage && (
          <div className="mt-6 border-l-2 border-white px-4 py-3 text-xs text-neutral-300">
            {saveMessage}
          </div>
        )}

        {isDirty && validationErrors.length > 0 && (
          <div className="mt-6 border-l-2 border-red-500 px-4 py-3">
            <p className="text-sm font-medium text-red-300">
              Fix these before saving
            </p>
            <ul className="mt-2 space-y-1 text-xs text-neutral-400">
              {validationErrors.slice(0, 5).map((message) => (
                <li key={message}>{message}</li>
              ))}
              {validationErrors.length > 5 && (
                <li>…and {validationErrors.length - 5} more</li>
              )}
            </ul>
          </div>
        )}

        {jsonOpen && (
          <section className="mt-8 overflow-hidden border border-white/[0.08] bg-[#101010]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div>
                <p className="text-sm font-medium">JSON inspector</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Current in-memory configuration
                </p>
              </div>

              <button type="button" onClick={copyJson} className={ghostButton}>
                {copied ? "Copied" : "Copy JSON"}
              </button>
            </div>

            <pre className="max-h-[500px] overflow-auto p-5 font-mono text-xs leading-6 text-neutral-300">
              {jsonValue}
            </pre>
          </section>
        )}

        <div className="mt-12 grid items-start gap-12 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-14">
            <section>
              <SectionHeading
                eyebrow="01 / GENERAL"
                title="Configuration details"
                description="Edit the metadata associated with this configuration."
              />

              <div className="mt-7 grid gap-x-10 gap-y-7 border-y border-white/[0.08] py-7 sm:grid-cols-2">
                <Field
                  label="Configuration name"
                  value={data.name}
                  onChange={(value) => updateValue(["name"], value)}
                />

                <Field
                  label="UUID"
                  value={data.uuid}
                  onChange={(value) => updateValue(["uuid"], value)}
                />

                <Field
                  label="Frame rate (FPS)"
                  type="number"
                  value={data.fps}
                  onChange={(value) => updateValue(["fps"], value)}
                />

                <Field
                  label="Duration (seconds)"
                  type="number"
                  value={data.length}
                  onChange={(value) => updateValue(["length"], value)}
                />

                <Field
                  label="Version"
                  type="number"
                  value={data.version}
                  onChange={(value) => updateValue(["version"], value)}
                />
              </div>
            </section>

            <section>
              <SectionHeading
                eyebrow="02 / VIDEO"
                title="Video preview"
                description="Slots are drawn over the frame at their current position."
              />

              <div className="mt-7 border-y border-white/[0.08] py-7">
                {videoFailed ? (
                  <div className="border border-dashed border-white/15 px-5 py-12 text-center">
                    <p className="text-sm font-medium text-neutral-300">
                      Video could not be loaded
                    </p>
                    <p className="mt-2 break-all font-mono text-[10px] text-neutral-600">
                      {originalData?.uuid}
                    </p>
                  </div>
                ) : (
                  <div className="relative inline-block max-w-full bg-black">
                    <video
                      key={originalData?.uuid}
                      src={videoUrlFor(originalData?.uuid ?? data.uuid)}
                      poster={thumbUrlFor(originalData?.uuid ?? data.uuid)}
                      controls
                      preload="metadata"
                      className="block max-h-[480px] max-w-full"
                      onLoadedMetadata={(event) =>
                        setVideoSize({
                          w: event.currentTarget.videoWidth,
                          h: event.currentTarget.videoHeight,
                        })
                      }
                      onError={() => setVideoFailed(true)}
                    />

                    {videoSize && (
                      <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        {data.slots.map((slot, index) => (
                          <div
                            key={index}
                            className="absolute border border-white/80 bg-white/10"
                            style={{
                              left: `${(slot.position.x / REFERENCE_FRAME.w) * 100}%`,
                              top: `${(slot.position.y / REFERENCE_FRAME.h) * 100}%`,
                              width: `${(slot.position.width / REFERENCE_FRAME.w) * 100}%`,
                              height: `${(slot.position.height / REFERENCE_FRAME.h) * 100}%`,
                            }}
                          >
                            <span className="absolute left-0 top-0 bg-white px-1 font-mono text-[9px] text-black">
                              {index + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <SectionHeading
                  eyebrow="03 / STRUCTURE"
                  title="Video slots"
                  description="Manage the rectangular regions associated with this video."
                />

                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-neutral-500">
                    {data.slots.length}{" "}
                    {data.slots.length === 1 ? "SLOT" : "SLOTS"}
                  </span>

                  <button
                    type="button"
                    onClick={() => setAddSlotOpen(true)}
                    className="bg-white px-4 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200"
                  >
                    + Add slot
                  </button>
                </div>
              </div>

              <div className="mt-7 space-y-8">
                {data.slots.length === 0 ? (
                  <div className="border-y border-dashed border-white/15 px-5 py-12 text-center">
                    <p className="text-sm font-medium text-neutral-300">
                      No slots in this configuration
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">
                      An empty list is valid. Add a slot when you need one.
                    </p>
                  </div>
                ) : (
                  data.slots.map((slot, index) => {
                    const isCollapsed = collapsed.has(index);
                    const slotErrors = validateSlot(slot, "");

                    return (
                      <section
                        key={index}
                        className="border-y border-white/[0.08]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 py-5">
                          <button
                            type="button"
                            onClick={() => toggleCollapsed(index)}
                            aria-expanded={!isCollapsed}
                            className="flex min-w-0 flex-1 items-center gap-4 text-left"
                          >
                            <span className="font-mono text-xs text-neutral-600">
                              {String(index + 1).padStart(2, "0")}
                            </span>

                            <div className="min-w-0">
                              <h3 className="flex items-center gap-3 text-base font-medium">
                                Slot {index + 1}
                                {slotErrors.length > 0 && (
                                  <span className="font-mono text-[10px] font-normal text-red-400">
                                    INVALID
                                  </span>
                                )}
                              </h3>
                              <p className="mt-1 truncate font-mono text-[10px] text-neutral-500">
                                {slot.id || "(no id)"}
                              </p>

                              {isCollapsed && (
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[10px] text-neutral-500">
                                    {slot.position.x},{slot.position.y} ·{" "}
                                    {slot.position.width}×{slot.position.height}
                                  </span>
                                  <span className="font-mono text-[10px] text-neutral-600">
                                    {slot.interaction ?? "null"}
                                  </span>
                                  {slot.tags.map((tag, tagIndex) => (
                                    <span
                                      key={tagIndex}
                                      className="border border-white/10 px-2 py-0.5 text-[10px] text-neutral-400"
                                    >
                                      {tag || "—"}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <span className="ml-auto font-mono text-xs text-neutral-600">
                              {isCollapsed ? "+" : "−"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => removeSlot(index)}
                            title="Remove this slot"
                            className={ghostButton}
                          >
                            Remove slot
                          </button>
                        </div>

                        {!isCollapsed && (
                          <div className="space-y-8 border-t border-white/[0.08] py-7">
                            <div>
                              <p className={labelClass}>Slot identifier</p>
                              <input
                                className={inputClass}
                                value={slot.id}
                                onChange={(event) =>
                                  updateValue(
                                    ["slots", index, "id"],
                                    event.target.value
                                  )
                                }
                              />
                              {!slot.id.trim() && (
                                <p className="mt-2 text-[11px] text-red-400">
                                  ID cannot be empty.
                                </p>
                              )}
                            </div>

                            <div className="border-l border-white/10 pl-6">
                              <div className="mb-5 flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-neutral-200">
                                    Position
                                  </p>
                                  <p className="mt-1 text-xs text-neutral-500">
                                    Rectangle coordinates and dimensions
                                  </p>
                                </div>

                                <span className="font-mono text-[10px] text-neutral-600">
                                  X / Y / W / H
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
                                {(["x", "y", "width", "height"] as const).map(
                                  (coordinate) => (
                                    <Field
                                      key={coordinate}
                                      label={coordinate}
                                      type="number"
                                      value={slot.position[coordinate]}
                                      onChange={(value) =>
                                        updateValue(
                                          [
                                            "slots",
                                            index,
                                            "position",
                                            coordinate,
                                          ],
                                          value
                                        )
                                      }
                                    />
                                  )
                                )}
                              </div>
                            </div>

                            <div>
                              <p className={labelClass}>Interaction</p>

                              <div className="flex flex-wrap items-center gap-5">
                                <input
                                  className={`${inputClass} min-w-0 flex-1`}
                                  value={slot.interaction ?? ""}
                                  placeholder="null — no interaction configured"
                                  onChange={(event) =>
                                    updateValue(
                                      ["slots", index, "interaction"],
                                      event.target.value === ""
                                        ? null
                                        : event.target.value
                                    )
                                  }
                                />

                                <button
                                  type="button"
                                  disabled={slot.interaction === null}
                                  onClick={() =>
                                    updateValue(
                                      ["slots", index, "interaction"],
                                      null
                                    )
                                  }
                                  className={`shrink-0 ${ghostButton}`}
                                >
                                  Set null
                                </button>
                              </div>

                              <p className="mt-2 text-[10px] text-neutral-600">
                                Leave empty to store null.
                              </p>
                            </div>

                            <div className="border-l border-white/10 pl-6">
                              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-neutral-200">
                                    Tags
                                  </p>
                                  <p className="mt-1 text-xs text-neutral-500">
                                    Add, edit or remove tags. Keep at least one
                                    tag.
                                  </p>
                                </div>

                                <div className="flex items-center gap-4">
                                  <span className="font-mono text-[10px] text-neutral-500">
                                    {slot.tags.length}{" "}
                                    {slot.tags.length === 1 ? "TAG" : "TAGS"}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => addTag(index)}
                                    className={ghostButton}
                                  >
                                    + Add tag
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-4">
                                {slot.tags.map((tag, tagIndex) => (
                                  <div
                                    key={tagIndex}
                                    className="flex items-center gap-4"
                                  >
                                    <span className="w-5 shrink-0 font-mono text-[10px] text-neutral-600">
                                      {String(tagIndex + 1).padStart(2, "0")}
                                    </span>

                                    <input
                                      className={inputClass}
                                      placeholder="Tag value"
                                      value={tag}
                                      onChange={(event) =>
                                        updateValue(
                                          ["slots", index, "tags", tagIndex],
                                          event.target.value
                                        )
                                      }
                                    />

                                    <button
                                      type="button"
                                      disabled={slot.tags.length <= 1}
                                      onClick={() => removeTag(index, tagIndex)}
                                      aria-label={`Remove tag ${tag}`}
                                      title={
                                        slot.tags.length <= 1
                                          ? "At least one tag is required"
                                          : "Remove this tag"
                                      }
                                      className="shrink-0 px-2 py-2 text-sm text-neutral-500 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>

                              {slot.tags.some((tag) => !tag.trim()) && (
                                <p className="mt-3 text-[11px] text-red-400">
                                  Tags cannot be empty.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </section>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-8 xl:sticky xl:top-28">
            <section className="border-t border-white/[0.08] pt-5">
              <p className={labelClass}>Document information</p>

              <div className="mt-7 space-y-7">
                <div>
                  <p className={labelClass}>File name</p>
                  <p className="break-all text-xs text-neutral-300">
                    {fileName}
                  </p>
                </div>

                <div>
                  <p className={labelClass}>Format</p>
                  <p className="text-xs text-neutral-300">MessagePack</p>
                </div>

                <div>
                  <p className={labelClass}>Configuration UUID</p>
                  <p className="break-all font-mono text-[10px] text-neutral-400">
                    {data.uuid}
                  </p>
                </div>

                <div>
                  <p className={labelClass}>Total slots</p>
                  <p className="text-sm font-medium text-white">
                    {data.slots.length}
                  </p>
                </div>

                <div>
                  <p className={labelClass}>Editing status</p>
                  <p className="text-xs text-neutral-300">
                    {isDirty ? "Unsaved changes" : "Up to date"}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.08] bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-10 lg:px-16">
          <div>
            <p className="text-xs font-medium text-neutral-300">
              {isDirty
                ? "You have unsaved changes"
                : "Everything is up to date"}
            </p>

            <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-neutral-600">
              {isDirty
                ? validationErrors.length > 0
                  ? "Fix validation errors to enable saving."
                  : "Review and save to update the MessagePack file."
                : "No pending changes."}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={!isDirty || saving}
              onClick={discardChanges}
              className="border border-white/10 px-4 py-3 text-xs text-neutral-400 transition hover:border-white/40 hover:text-white disabled:opacity-30"
            >
              Discard
            </button>

            <button
              type="button"
              disabled={!canSave}
              onClick={() => setReviewOpen(true)}
              className="bg-white px-5 py-3 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {saving ? "Saving..." : "Save configuration"}
            </button>
          </div>
        </div>
      </footer>

      {addSlotOpen && (
        <AddSlotModal
          existingIds={data.slots.map((slot) => slot.id)}
          onClose={() => setAddSlotOpen(false)}
          onCreate={createSlot}
        />
      )}

      {reviewOpen && (
        <ReviewModal
          changes={changes}
          saving={saving}
          onCancel={() => setReviewOpen(false)}
          onConfirm={saveChanges}
        />
      )}
    </main>
  );
};

export default ConfigDetail;