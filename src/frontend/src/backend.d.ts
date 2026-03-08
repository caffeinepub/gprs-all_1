import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Coordinate {
    latitude: number;
    description: string;
    longitude: number;
}
export interface backendInterface {
    addCoordinate(latitude: number, longitude: number, description: string): Promise<void>;
    deleteCoordinate(id: bigint): Promise<void>;
    getAllCoordinates(): Promise<Array<Coordinate>>;
    getCoordinate(id: bigint): Promise<Coordinate>;
}
