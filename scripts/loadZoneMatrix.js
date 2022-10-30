// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const fs = require('fs');
const readline = require('readline');

const { ArgumentParser } = require('argparse');

const mongo = require('../app/helpers/mongo');
const ZoneMatrix = require('../app/models/zoneMatrix');

const parseMatrix = (matrix) => {
    const result = [];
    const terminators = ['*', 'a', 'e', 'b', ' ', '1'];
    let current = '';
    for (let i = 0; i < matrix.length; i++) {
        const char = matrix.charAt(i);
        // we have a zone and we dont have a terminator
        if (current.length && !terminators.includes(char)) {
            result.push(current);
            result.push(char);
            current = '';
        } else if (current.length) {
            if (char !== ' ') current = current.concat(char);
            if (terminators.includes(char)) {
                result.push(current);
                current = '';
            }
        } else {
            if (char !== ' ') current = current.concat(char);
        }
    }

    return result;
};

const main = async (args) => {
    const readInterface = readline.createInterface({
        input: fs.createReadStream(args.input),
        console: false
    });

    const JSONMatrix = {};

    readInterface.on('line', function (line) {
        JSONMatrix[line.substr(0, 3)] = line.substr(3);
    });

    readInterface.on('close', async () => {
        await mongo.connect();

        for (const [key, value] of Object.entries(JSONMatrix)) {
            const matrix = parseMatrix(value);
            await ZoneMatrix.dbset({
                prefix: key,
                matrix: matrix
            });
        }

        process.exit(1);
    });
};

const parser = new ArgumentParser({ description: 'Update zoneMatric collection from CSV' });
parser.add_argument('-i', '--input', { help: 'Path to zone matrix CSV' });

main(parser.parse_args())
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
