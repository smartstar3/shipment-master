// subsystems/services/serviceStatusEmitter -- process emitted events from the carrier-services layer
//
'use strict';
const { getLogger } = require('@onelive-dev/x-logger');

const eventEmitter = require('../../config').eventEmitter;
const services = require('../../models/services');
const serviceStatus = require('../../models/serviceStatus');

const logger = getLogger(module);

const listener = async (status) => {
    logger.debug('listener fired', { status });

    // fetch my service id from name registry
    let svcId;
    let service = await services.dbget({ name: status.serviceName });
    if (service) svcId = service._id; // ok, fetch ID
    else {
        // serviceName does not exist... set it now
        service = await services.dbset({ name: status.serviceName });
        svcId = service._id;
    }
    logger.debug('svcId determined', { svcId });

    // fetch most recent record
    const statusRec = await serviceStatus.dbgetlast({ serviceId: svcId });
    if (!statusRec) {
        // does not exist... write first record
        await serviceStatus.dbset({ serviceId: svcId, status, created_at: new Date(), updated_at: new Date(), updateCnt: 1 });
    } else {
        // if within an hour from last create/update, update else create new
        const duration = new Date().getTime() - new Date(statusRec.created_at).getTime();
        const oneHourOnSecond = 1000 * 60 * 60;

        if (duration > oneHourOnSecond) { await serviceStatus.dbset({ serviceId: svcId, status, created_at: new Date(), updated_at: new Date(), updateCnt: 1 }); } else {
            // maintain sum of bytes Rx/Tx and response time.. can be used for average on hourly record (e.g., byte count / updateCnt = avg)
            if (Reflect.has(status, 'bytesTx')) status.bytesTx += statusRec.status.bytesTx;
            if (Reflect.has(status, 'bytesRx')) status.bytesRx += statusRec.status.bytesRx;
            if (Reflect.has(status, 'responseMs')) status.responseMs += statusRec.status.responseMs;
            await serviceStatus.dbupdate({ id: statusRec._id, status, updated_at: new Date(), updateCnt: ++statusRec.updateCnt });
        }
    }
    logger.debug('serviceStatusEmitter listener execution complete', { event: status });
};

// subscribe and process emitted events for the 'carrier-service' type
// 'service' events may be free form but have the following requirements:
// eventRec = {
// required:
//   serviceName: <string> unique name/type of service
//   status: <string> ['OK', 'ERROR', etc.]
// optional:
//   responseMs: <int> MilliSec transaction time
//   url: <string>
//   bytesTx: <int>
//   bytesRx: <int>
// };
//
// Note: 'listener' function MUST proceed asynchronously to initial call and not block caller.
//
eventEmitter.on('carrier-service', listener);
