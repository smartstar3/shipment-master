# How to use service status functions

The OLX app allows for a publish/subscribe model for status and event
transmission throiug the system. In the app/config module, a global
EventEmitter is defined for system usage.

Any status emitter may emit through this emitter. The only conditions
are a standardirzed service name and status object format.

Event listeners subscribe to that global emitter and process events as
defined by the specific service/event type.

For example, a service type may be defined as carrier
transactions. Each carrier API driver will emit a status record with a
consistent name and object format upin each API transaction.

A listener subscribes to the carrier transaction service, and is
called upon each event emit. Note: the 'emit' and 'on' calls are
synchronous. For this reason, it is expected that the listener 'on'
function create an asynchrnous processing function to process the
event but return to the calling 'emit' function immediately.

## app/subsystems/services/serviceStatusEmitter.js

This module is the subscriber to the ```carrier-service``` event
stream on the global event emitter. These events are caught by this
module and formatted into the **app/models/serviceStatus** collection
according to:

* The **app/models/services** collection is automatically maintained to
establish service name to service ID in the db

* Each status document contains ```created_at``` and
```updated_at``` fields. These are used as below:

* For each service name, an hourly summary is maintained such that
  the collection only contains one record per hour per service
  name. Intra-hour events are summarized and updated into a single
  document.

* Each summary document contains ```updateCnt``` which can serve as
the denomiator for calculating average from the summary fields.
