
import type { LocationKey, Location } from '../modules/Traversing.js';

import type { DecodeError, DecodeReport } from '../modules/Decoding.js';
import * as D from '../modules/Decoding.js';


type DecodeErrorWithLocation = { location : Location, reason : DecodeError };

const FlattenReporter = (report : DecodeReport) : Array<DecodeErrorWithLocation> => {
    if (!Array.isArray(report)) {
        return [{ location: [], reason: report }];
    }
    
    const reasonsByKey = new Map<LocationKey, Array<DecodeReport>>();
    
    // Aggregate reasons by key
    for (const reportItem of report) {
        const key = reportItem.key;
        
        if (reasonsByKey.has(key)) {
            reasonsByKey.get(key)!.push(reportItem.reason);
        } else {
            reasonsByKey.set(key, [reportItem.reason]);
        }
    }
    
    const errors : Array<DecodeErrorWithLocation> = [];
    reasonsByKey.forEach((reportsForKey, key) => {
        const childReports = reportsForKey.flatMap(FlattenReporter)
            .map(report => ({ ...report, location: [key, ...report.location] }));
        
        errors.push(...childReports);
    });
    
    return errors;
};

export default FlattenReporter;
