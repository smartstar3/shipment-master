const chai = require('chai');

chai.use(require('chai-as-promised'));
chai.use(require('chai-exclude'));
chai.use(require('chai-http'));
chai.use(require('chai-js-factories'));
chai.use(require('chai-string'));

require('./factories');
