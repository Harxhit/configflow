export interface Config {
    uuid: string;
    fps: number;
    length: number;
    name: string;
    version: number;
    slots: Slot[];
}

export interface Slot {
    id: string;
    position: Position;
    interaction: string | null;
    tags: string[];
}

export interface Position {
    x: number;
    y: number;
    width: number;
    height: number;
}