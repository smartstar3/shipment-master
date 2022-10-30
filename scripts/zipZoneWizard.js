// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const csvtojson = require('csvtojson');
const { prompt } = require('enquirer');

const mongo = require('../app/helpers/mongo');
const ZipZone = require('../app/models/zipZones');

const exitPrompt = (message) => {
    logger.info(`Exiting wizard : ${message}`);
    process.exit(1);
};

const processCSV = async (path) => {
    const result = [];
    await csvtojson({ ignoreEmpty: true })
        .fromFile(path)
        .subscribe((row) => {
            const zipZone = {
                zipcode: row.zipcode,
                sortcode: row.sortcode,
                carrier: row.carrier,
                service: row.service,
                max_weight: parseInt(row.max_weight),
                shipper_id: parseInt(row.shipper_id) || null,
                options: row.options || {}
            };

            if (row.tobacco && row.tobacco.toUpperCase() === 'TRUE') zipZone.tobacco = true;
            result.push(zipZone);
        });
    return result;
};

const confirmMessage = (fileCount, originalCount, carrier, append = false, del = false) => {
    let message = `Commit operations to the Database? for carrier ${carrier}?`;
    if (append) {
        message = `Add ${fileCount} zipzone records to ${carrier}? New Total = ${fileCount + originalCount}`;
    } else if (del) {
        message = `Delete ${originalCount} zipzone records and add ${fileCount} records to ${carrier}? New Total = ${fileCount}`;
    }
    return message;
};

const main = async () => {
    try {
        const mongoURL = process.env.MONGO_URI;

        const { dbConfirm } = await prompt({
            type: 'confirm',
            name: 'dbConfirm',
            message: `Connect to database @ :  ${mongoURL} ?`
        });

        if (!dbConfirm) exitPrompt('Did not confirm database Info');

        await mongo.connect();
        const collection = mongo.get().db().collection(ZipZone.name);
        const existingCarriers = await collection.distinct('carrier');
        let carrierOp = null;

        const { carrier } = await prompt({
            type: 'Select',
            name: 'carrier',
            message: 'Select A Carrier',
            choices: ['New Carrier', ...existingCarriers]
        });

        carrierOp = carrier;

        if (carrier === 'New Carrier') {
            const { newCarrier } = await prompt({
                type: 'Input',
                name: 'newCarrier',
                message: 'What is the new carriers name?'
            });
            carrierOp = newCarrier;
        }

        const { carrierConfirm } = await prompt({
            type: 'confirm',
            name: 'carrierConfirm',
            message: `Zipzone file is for carrier ${carrierOp}`
        });

        if (!carrierConfirm) {
            exitPrompt('Did not confirm carrier');
        }

        const zipZoneCount = await collection.countDocuments({ carrier: carrierOp });
        logger.info(`${carrierOp} has ${zipZoneCount} existing zipones`);

        const { inputFile } = await prompt({
            type: 'Input',
            name: 'inputFile',
            message: 'What is the input file path'
        });

        const { append } = await prompt({
            type: 'confirm',
            name: 'append',
            message: `append zipzones to ${zipZoneCount} already existing records for ${carrierOp}?`
        });

        const zipZoneObjects = await processCSV(inputFile);

        if (!zipZoneObjects.length) exitPrompt('No records found in csv');

        const { willDelete } = await prompt({
            skip: append === true,
            type: 'confirm',
            name: 'willDelete',
            message: `Delete Existing Zipzones for ${carrierOp}?`
        });

        const { commit } = await prompt({
            type: 'confirm',
            name: 'commit',
            message: confirmMessage(zipZoneObjects.length, zipZoneCount, carrierOp, append, willDelete)
        });

        if (commit) {
            if (willDelete) {
                const { confirmDelete } = await prompt({
                    type: 'confirm',
                    name: 'confirmDelete',
                    message: `Are you sure you want to Delete ${zipZoneCount} Zipzones for ${carrierOp}?`
                });
                if (confirmDelete) {
                    await collection.deleteMany({ carrier: carrierOp });
                }
            }

            const batch = collection.initializeUnorderedBulkOp();
            for (const zz of zipZoneObjects) {
                if (append) {
                    batch.insert(zz);
                } else {
                    batch.find({ zipcode: zz.zipcode, shipper_id: zz.shipper_id, carrier: zz.carrier })
                        .upsert()
                        .update({ $set: zz });
                }
            }
            await batch.execute();
            logger.info('Finished committing changes to the database');
            const newCount = await collection.countDocuments({ carrier: carrierOp });
            logger.info(`${carrierOp} now has ${newCount} zipzones.`);
        }

        process.exit(0);
    } catch (err) {
        logger.error('error running script', err);
        exitPrompt(err.message);
    }
};

main();
