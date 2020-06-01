
export type LocationKey = unknown;
export type Location = Array<LocationKey>;

export const isLocationKey = (input : unknown) : input is LocationKey => true;
export const isLocation = (input : unknown) : input is Location => Array.isArray(input);
