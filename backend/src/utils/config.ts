import { decode, encode } from "@msgpack/msgpack";
import fs from "fs/promises";
import path from "path";
import { folderPath } from "../controllers/config.controller";
import type { Config } from "../types/config.types";

type Update = {
    path: (string | number)[];
    value: unknown;
};

const decodeMsgFile = async (fileName: string) => {
    const buffer = await fs.readFile(
        path.join(folderPath, fileName)
    );

    return decode(buffer);
};

const validateUpdatePaths = (
    data: unknown,
    updates: Update[]
): void => {
    for (const update of updates) {
        let current: any = data;

        for (const key of update.path) {
            if (
                current === null ||
                typeof current !== "object" ||
                !Object.hasOwn(current, key)
            ) {
                throw new Error(
                    `Field path does not exist: ${update.path.join(".")}`
                );
            }

            current = current[key];
        }
    }
};

const getValueAtPath = (
    data: unknown,
    fieldPath: (string | number)[]
): unknown => {
    let current: any = data;

    for (const key of fieldPath) {
        current = current[key];
    }

    return current;
};

const validateUpdateTypes = (
    data: unknown,
    updates: Update[]
): void => {
    for (const update of updates) {
        const existingValue = getValueAtPath(data, update.path);
        const newValue = update.value;

        if (Array.isArray(existingValue)) {
            if (!Array.isArray(newValue)) {
                throw new Error(
                    `Expected an array at ${update.path.join(".")}`
                );
            }

            continue;
        }

        if (
            existingValue !== null &&
            typeof existingValue === "object"
        ) {
            if (
                newValue === null ||
                typeof newValue !== "object" ||
                Array.isArray(newValue)
            ) {
                throw new Error(
                    `Expected an object at ${update.path.join(".")}`
                );
            }

            continue;
        }

        if (existingValue === null) {
            if (newValue !== null) {
                throw new Error(
                    `Expected null at ${update.path.join(".")}`
                );
            }

            continue;
        }

        if (typeof existingValue !== typeof newValue) {
            throw new Error(
                `Type mismatch at ${update.path.join(".")}`
            );
        }

        if (
            typeof existingValue === "number" &&
            Number.isInteger(existingValue) &&
            (typeof newValue !== "number" ||
                !Number.isInteger(newValue))
        ) {
            throw new Error(
                `Expected an integer at ${update.path.join(".")}`
            );
        }
    }
};

const encodeMsgFile = async (fileName: string, data: unknown) => {
    const encoded = encode(data);

    await fs.writeFile(path.join(folderPath, fileName), encoded);
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value);

const hasExactKeys = (
    value: UnknownRecord,
    expectedKeys: string[]
): boolean => {
    const actualKeys = Object.keys(value);

    return (
        actualKeys.length === expectedKeys.length &&
        expectedKeys.every((key) => Object.hasOwn(value, key))
    );
};

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0;


const validateConfig :(data: unknown) => asserts data is Config = (data) => {
    if (!isRecord(data)) {
        throw new Error("Configuration must be an object");
    }

    const configFields = [
        "uuid",
        "fps",
        "length",
        "name",
        "version",
        "slots",
    ];

    if (!hasExactKeys(data, configFields)) {
        throw new Error(
            "Configuration must contain exactly: uuid, fps, length, name, version, slots"
        );
    }

    if (typeof data.uuid !== "string") {
        throw new Error("uuid must be a string");
    }

    if (!isNonNegativeNumber(data.fps)) {
        throw new Error("fps must be a finite number");
    }

    if (!isNonNegativeNumber(data.length)) {
        throw new Error("length must be a finite number");
    }

    if (typeof data.name !== "string") {
        throw new Error("name must be a string");
    }

    if (!isNonNegativeNumber(data.version) || !Number.isInteger(data.version)) {
        throw new Error("version must be an integer");
    }

    if (!Array.isArray(data.slots) || data.slots.length === 0) {
        throw new Error("Invalid slots format");
    }

    for (let index = 0; index < data.slots.length; index++) {
        const slot = data.slots[index];
        const slotPath = `slots[${index}]`;

        if (!isRecord(slot)) {
            throw new Error(`${slotPath} must be an object`);
        }

        if (!hasExactKeys(slot, ["id", "position", "interaction", "tags"])) {
            throw new Error(
                `${slotPath} must contain exactly: id, position, interaction, tags`
            );
        }

        if (typeof slot.id !== "string") {
            throw new Error(`${slotPath}.id must be a string`);
        }

        if (!isRecord(slot.position)) {
            throw new Error(`${slotPath}.position must be an object`);
        }

        if (!hasExactKeys(slot.position, ["x", "y", "width", "height"])) {
            throw new Error(
                `${slotPath}.position must contain exactly: x, y, width, height`
            );
        }

        for (const key of ["x", "y", "width", "height"] as const) {
            const value = slot.position[key];

            if (!isNonNegativeNumber(value)) {
                throw new Error(
                    `${slotPath}.position.${key} must be a finite number`
                );
            }
        }

        if (
            slot.interaction !== null &&
            typeof slot.interaction !== "string"
        ) {
            throw new Error(
                `${slotPath}.interaction must be a string or null`
            );
        }

        if (!Array.isArray(slot.tags) || slot.tags.length === 0) {
            throw new Error('Invalid slot tags');
        }

        for (let tagIndex = 0; tagIndex < slot.tags.length; tagIndex++) {
            if (typeof slot.tags[tagIndex] !== "string") {
                throw new Error(
                    `${slotPath}.tags[${tagIndex}] must be a string`
                );
            }
        }
    }
};

export {
    decodeMsgFile,
    validateUpdatePaths,
    getValueAtPath,
    validateUpdateTypes,
    encodeMsgFile,
    validateConfig,
    isNonNegativeNumber
};