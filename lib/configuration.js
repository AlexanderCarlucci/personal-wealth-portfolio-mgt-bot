/*
* This file contains all the startup configuration
* for the Watson conversation chat bot
*/

//imports
var watson = require('watson-developer-cloud');
var cfenv = require('cfenv');
var fs = require('fs');
var vcapServices = require('vcap_services');
var rp = require('request-promise');
var util = require('util');

var conversationWorkspace;
var conversation;

/*
*This function inititalizes the watson conversation workspace and
*automatically trains the chat bot.
*if the chat bot has already been initialized then it grabs the workspace_id of the
*already trained chat bot
*/
function init(){
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

function configurePortfolio() {
    var credentials = vcapServices.getCredentials("fss-portfolio-service");
    var investmentUserId;
    var investmentUserPassword;
    console.log(credentials);
    if(credentials.writer) {
        investmentUserId = credentials.writer.userid || process.env.CRED_PORTFOLIO_USERID;
        investmentUserPassword = credentials.writer.password || process.env.CRED_PORTFOLIO_PWD;
    } else {
        investmentUserId = process.env.CRED_PORTFOLIO_USERID;
        investmentUserPassword = process.env.CRED_PORTFOLIO_PWD;
    }
    var investmentUrl = credentials.url || process.env.URL_GET_PORTFOLIO_HOLDINGS;
    investmentUrl += "api/v1/portfolios";
    if( investmentUserId && investmentUserPassword && investmentUrl) {
        //check if an existing portfolio is present within the service
        var portfolio = getPortfolio(investmentUserId, investmentUserPassword, investmentUrl);
        portfolio.then( function (body){
            // we have a portfolio so do nothing
            console.log(body);
            console.log('Portfolio Already exists, no need to reconfigure');
        })
        .catch(function (err) {
            if(err.statusCode === 404) {
                // no portfolio was found so we will create a new one.
                console.log('Portfolio does not exist creating one.');
                createPortfolioAndHoldings(investmentUserId, investmentUserPassword, investmentUrl);
            }else{
                console.error(err);
            }

        });

    } else {
        console.error('Investment portfolio service not configured properly, please check your .env');
    }

}

function getPortfolio(user,pass,url){

    var sURI = util.format("%s/%s", url, 'P1');
    var options = {
        method: 'GET',
        uri: sURI,
        auth: {
            'user': user,
            'pass': pass
        },
        json: true // Automatically parses the JSON string in the response
    };
    return rp(options);
}

function createPortfolioAndHoldings(user, pass, url) {
    var portfolio = createPortfolio(user, pass, url);
    portfolio.then(function (body) {
        console.log('Portfolio P1 created....');
        console.log(body);
        return seedHoldings(user, pass, url);
    })
    .then(function(body) {
        console.log('Holdings seeded...');
        console.log(body);
    })
    .catch(function(err) {
        console.log('error seeding holdings');
        console.error(err);
    });
}

function createPortfolio(user, pass, url) {
    var options = {
        method: 'POST',
        uri: url,
        body: {
            name: "P1",
            timestamp: "2017-02-24T19:53:56.830Z"
        },
        auth: {
            'user': user,
            'pass': pass
        },
        headers: {
            accept: "application/json",
            "content-type": "application/json",
        },
        json: true // Automatically parses the JSON string in the response
    };
    return rp(options);
}

function seedHoldings(user, pass, url) {
    var sURI = util.format("%s/%s/holdings", url, 'P1');
    var options = {
        method: 'POST',
        uri: sURI,
        body: {
            timestamp: "2017-02-24T19:53:56.830Z",
            holdings: [
                {
                    "asset": "IBM", "quantity": 1500, "instrumentId": "CX_US4592001014_NYQ"
                },
                {
                    "asset": "GE",
                    "quantity": 5000,
                    "instrumentId": "CX_US3696041033_NYQ"
                },
                {
                    "asset": "F", "quantity": 5000, "instrumentId": "CX_US3453708600_NYQ"
                },
                {
                    "asset": "BAC",
                    "quantity": 1800,
                    "instrumentId": "CX_US0605051046_NYS"
                }
            ]
        },
        auth: {
            'user': user,
            'pass': pass
        },
        headers: {
            accept: "application/json",
            "content-type": "application/json",
        },
        json: true // Automatically parses the JSON string in the response
    };
    return rp(options);

}

// retrieve the watson conversation workspace ID
module.exports.getWorkspaceId = function() {
    return conversationWorkspace;
};

// configure the investment portfolio service
module.exports.configurePortfolio = function() {
    configurePortfolio();
};