
import $msg from 'message-tag';
import * as ObjectUtil from '../util/ObjectUtil.js';
import * as MapUtil from '../util/MapUtil.js';

import type { LocationKey, Location } from '../modules/Traversing.js';

import type { DecodeError, DecodeReport } from '../modules/Decoding.js';
import * as D from '../modules/Decoding.js';

import type { FlattenedReport } from './FlattenReporter.js';
import flatten from './FlattenReporter.js';


const locationAsString = (location : Location) => {
    return location.join('.');
};

const reportItem = (location : Location, report : FlattenedReport) => {
    if (report instanceof Map) {
        return $msg`Error at ${locationAsString(location)}: ${reportAsText(report)}`;
    } else {
        return $msg`Error at ${locationAsString(location)}: ${report.type}`;
    }
};

const reportAsText = (report : FlattenedReport) : string => {
    if (!(report instanceof Map)) {
        return reportItem([], report);
    }
    
    return [...report.entries()]
        .map(([location, { report }]) => reportItem(location, report))
        .join('\n');
};

const TextReporter = (report : DecodeReport) : string => {
    const reportFlattened = flatten(report);
    
    return reportAsText(reportFlattened);
};

export default TextReporter;
