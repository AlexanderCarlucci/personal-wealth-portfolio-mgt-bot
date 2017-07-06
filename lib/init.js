/*
* This file contains all the startup configuration
* for the Watson conversation chat bot
*/

//imports
var conversation = require('./api/conversation').getConversationObj();
var cfenv = require('cfenv');
var fs = require('fs');


//load VCAP config
var vcapLocal = null;
var appEnv = null;
var appEnvOptions = {};
var conversationWorkspace;

function init (){
    fs.stat('./vcap-local.json', function(err, stat) {
        if (err && err.code === 'ENOENT') {
            // file does not exist
            console.log('No vcap-local.json');
            initEnv();
        } else if (err) {
            console.log('Error retrieving local vcap: ', err.code);
        } else {
            vcapLocal = require("../vcap-local.json");
            console.log("Loaded local VCAP", vcapLocal);
            appEnvOptions = {
                vcap: vcapLocal
            };
            initEnv();
        }
    });
}
function initEnv(){
    appEnv = cfenv.getAppEnv(appEnvOptions);
    if (appEnv.isLocal) {
        require('dotenv').load();
    }
    if (appEnv.services.conversation) {
        initConversation();
    } else {
        console.error("No Watson conversation service exists");
    }
}

function initConversation(){
    var credentials = appEnv.getServiceCreds("Conversation-service");
    conversationWorkspace = process.env.CONVERSATION_WORKSPACE;

    if(!conversationWorkspace){
        const workSpaceName = appEnv.name;
        conversation.listWorkspaces( function (err, result) {
            if (err) {
                console.log('Failed to query workspaces. Conversation will not work.', err);
            } else {
                const workspace = result.workspaces.find(workspace => workspace.name === workSpaceName);
                if (workspace){
                    conversationWorkspace = workspace.workspace_id;
                } else {
                    const defaultWorkspace = JSON.parse(fs.readFileSync('./resources/workspace.json'));
                    defaultWorkspace.name = workSpaceName;
                    conversation.createWorkspace(defaultWorkspace, function(createErr, workspace) {
                        if (createErr){
                           console.log('Failed to create workspace');
                        } else {
                            conversationWorkspace = workspace.workspace_id;
                            console.log('Successfully created the workspace '+ workSpaceName);
                            console.log("Using Watson Conversation with workspace " + conversationWorkspace);
                        }
                    });
                }
            }
        });
    }  else {
    console.log('Workspace ID was specified as an environment variable.');
    console.log("Using Watson Conversation with workspace" + conversationWorkspace);
    }
}

module.exports.init  = function () {
    init();
};
