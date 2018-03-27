/**
 * Actions Controller.
 *
 * Manages the top level actions queue for the gateway and things.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const PromiseRouter = require('express-promise-router');
const Action = require('../models/action');
const Actions = require('../models/actions');
const AddonManager = require('../addon-manager');
const Things = require('../models/things');

const ActionsController = PromiseRouter({mergeParams: true});

/**
 * Handle creating a new action.
 */
ActionsController.post('/', async (request, response) => {
  const keys = Object.keys(request.body);
  if (keys.length != 1) {
    const err = 'Incorrect number of parameters.';
    console.log(err, request.body);
    response.status(400).send(err);
    return;
  }

  const actionName = keys[0];
  const actionParams = request.body[actionName].input;
  const thingId = request.params.thingId;
  let action = null;

  if (thingId) {
    try {
      const thing = await Things.getThing(thingId);
      action = new Action(actionName, actionParams, thing);
    } catch(e) {
      console.error('Thing does not exist', thingId, e);
      response.status(404).send(e);
      return;
    }
  } else {
    action = new Action(actionName, actionParams);
  }

  try {
    await Actions.add(action);
    if (thingId) {
      await AddonManager.requestAction(
        thingId, action.id, actionName, actionParams);
    }

    response.status(201).json({[actionName]: action.getDescription()});
  } catch(e) {
    console.error('Creating action', actionName, 'failed');
    console.error(e);
    response.status(400).send(e);
  }
});

/**
 * Handle getting a list of actions.
 */
ActionsController.get('/', function(request, response) {
  if (request.params.thingId) {
    response.status(200).json(Actions.getByThing(request.params.thingId));
  } else {
    response.status(200).json(Actions.getGatewayActions());
  }
});

/**
 * Handle getting a particular action.
 */
ActionsController.get('/:actionName/:actionId', function(request, response) {
  var actionId = request.params.actionId;
  var action =  Actions.get(actionId);
  if (action) {
    response.status(200).json(action);
  } else {
    var error = 'Action "' + actionId + '" not found';
    console.error(error);
    response.status(404).send(error);
  }
});

/**
 * Handle cancelling an action.
 */
ActionsController.delete('/:actionName/:actionId', (request, response) => {
  var actionId = request.params.actionId;
  try {
    Actions.remove(actionId);
  } catch(e) {
    console.error('Removing action', actionId, 'failed');
    console.error(e);
    response.status(404).send(e);
    return;
  }
  response.status(204).end();
});

module.exports = ActionsController;
