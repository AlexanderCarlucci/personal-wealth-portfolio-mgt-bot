/*
* This file contains all the startup configuration
* for the Watson conversation chat bot
*/

//imports
var watson = require('watson-developer-cloud');
var cfenv = require('cfenv');
var fs = require('fs');

var conversationWorkspace;
var conversation;

function init(){
    var vcapServices = require('vcap_services');
    var credentials = vcapServices.getCredentials('conversation');
    console.log(credentials);
    var conversationUsername =  credentials.username || process.env.CONVERSATION_USERNAME;
    var conversationPassword =  credentials.password || process.env.CONVERSATION_PASSWORD;
    var conversationURL =  credentials.url || process.env.CONVERSATION_URL;

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
        const workSpaceName = 'portfolio-chat-bot';
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
init();

module.exports.getWorkspaceId = function (){
    return conversationWorkspace;
}