
import type { LocationKey, Location } from '../modules/Traversing.js';

import type { DecodeError, DecodeReportChild, DecodeReportChildren, DecodeReport } from '../modules/Decoding.js';
import * as D from '../modules/Decoding.js';


/*
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
*/

export type FlattenedReportChild = { given ?: unknown, report : FlattenedReport };
export type FlattenedReportChildren = Map<Location, FlattenedReportChild>;
export type FlattenedReport =
    | DecodeError
    | FlattenedReportChildren;

const flatten = (report : DecodeReport) : FlattenedReport => {
    if (!(report instanceof Map)) {
        return report;
    }
    
    const reportFlattened : FlattenedReport = new Map();
    
    report.forEach(({ given, report: childReport }, key) => {
        const childReportFlattened = flatten(childReport);
        
        if (!(childReportFlattened instanceof Map)) {
            reportFlattened.set([key], { report: childReportFlattened });
            return;
        } else {
            // TODO: introduce something like MapUtil.map/flatMap
            const childReportsWithKey = new Map<Location, FlattenedReport>(
            );
            [...childReportFlattened.entries()].forEach(([locationChild, entry]) => {
                const location = [key, ...locationChild];
                
                reportFlattened.set(location, entry);
            });
        }
    });
    
    return reportFlattened;
};

export default flatten;
