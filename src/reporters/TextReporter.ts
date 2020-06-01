
import type { LocationKey, Location } from '../modules/Traversing.js';

import type { DecodeError, DecodeReport } from '../modules/Decoding.js';
import * as D from '../modules/Decoding.js';

import FlattenReporter from './FlattenReporter.js';


type DecodeErrorWithLocation = { location : Location, reason : DecodeError };

const TextReporter = (report : DecodeReport) : Array<DecodeErrorWithLocation> => {
    // TODO
};

export default TextReporter;
