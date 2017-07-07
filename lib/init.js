/*
* This file contains all the startup configuration
* for the Watson conversation chat bot
*/

//imports
var watson = require('watson-developer-cloud');
var cfenv = require('cfenv');
var fs = require('fs');


//load VCAP config
var vcapLocal = null;
var appEnv = null;
var appEnvOptions = {};
var conversationWorkspace;
var conversation;

function init (){
    //Check for local VCAP
    console.log('checking for vcap-local.json');
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
        console.log('initializing conversation');
        initConversation();
    } else {
        console.error("No Watson conversation service exists");
    }
}

function initConversation(){
    var credentials = appEnv.getServiceCreds("Conversation-service");
    console.log(credentials);
    var conversationUsername = process.env.CONVERSATION_USERNAME || credentials.username;
    var conversationPassword = process.env.CONVERSATION_PASSWORD || credentials.password;
    var conversationURL = process.env.CONVERSATION_URL || credentials.url;

    conversation = watson.conversation({
        url: conversationURL,
        username: conversationUsername,
        password: conversationPassword,
        version_date: '2016-07-11',
        version: 'v1'
    });

    console.log('checking for workspace environment override');
    conversationWorkspace = process.env.CONVERSATION_WORKSPACE;
    if(!conversationWorkspace){
        console.log('no override found');
        const workSpaceName = appEnv.name;
        conversation.listWorkspaces( function (err, result) {
            if (err) {
                console.log('Failed to query workspaces. Conversation will not work.', err);
            } else {
                const workspace = result.workspaces.find(workspace => workspace.name === workSpaceName);
                if (workspace){
                    console.log('found an existing workspace');
                    conversationWorkspace = workspace.workspace_id;
                    console.log("Using Watson Conversation with workspace " + conversationWorkspace);
                } else {
                    console.log('creating new workspace');
                    const defaultWorkspace = JSON.parse(fs.readFileSync('./resources/workspace.json'));
                    defaultWorkspace.name = workSpaceName;
                    conversation.createWorkspace(defaultWorkspace, function(createErr, workspace) {
                        if (createErr) {
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
    return conversationWorkspace;
};
