require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { TikTokConnectionWrapper, getGlobalConnectionCount } = require('./connectionWrapper');
const { clientBlocked } = require('./limiter');
const { OpenAI } = require('openai');
const axios = require('axios');
const db = require('./db'); // Import our database module
const path = require('path'); // Add path module
const cors = require('cors'); // Import cors package
const tavily = require('@tavily/core');
const exec = require('child_process').exec;

const app = express();
const httpServer = createServer(app);

let hasBotName=false;
let theBotName="";
// Default Ollama settings
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: "dummy-key",
});

// Apply CORS middleware to Express
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Enable cross origin resource sharing
const io = new Server(httpServer, {
    cors: {
        origin: '*'
    }
});

// Initialize database
db.initDatabase()
    .then(() => {
        console.log('Database initialized successfully');
    })
    .catch(err => {
        console.error('Error initializing database:', err);
    });

// Function to get available Ollama models
async function getOllamaModels() {
    try {
        console.log(`Fetching Ollama models from ${OLLAMA_HOST}/api/tags`);
        const response = await axios.get(`${OLLAMA_HOST}/api/tags`, { 
            timeout: 5000, // 5 second timeout
            headers: { 'Accept': 'application/json' }
        });
        
        // Log the response for debugging
        console.log('Ollama response status:', response.status);
        
        if (response.data && response.data.models) {
            // If models array exists, return it
            console.log(`Found ${response.data.models.length} Ollama models`);
            return response.data.models || [];
        } else {
            // Log the actual response shape if it's not what we expect
            console.log('Unexpected Ollama response format:', JSON.stringify(response.data));
            return [];
        }
    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Error fetching Ollama models - Response error:', error.response.status, error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('Error fetching Ollama models - No response received. Is Ollama running?');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error fetching Ollama models:', error.message);
        }
        return [];
    }
}

// Function to moderate text using OpenAI
async function moderateText(text, apiKey = null) {
    try {
        // Use provided API key or fall back to environment variable
        const openaiClient = apiKey ? 
            new OpenAI({ apiKey }) : 
            openai;
            
        const response = await openaiClient.moderations.create({
            model: "omni-moderation-latest",
            input: text,
        });
        
        return response.results[0];
    } catch (error) {
        console.error('Error during OpenAI moderation:', error);
        return null;
    }
}

// Function to moderate text using Ollama
async function moderateTextWithOllama(text, model = 'llama3') {
    try {
        const moderationPrompt = `
You are a content moderation system. Analyze the following message and determine if it contains harmful content.
Any type of insult or racism or patriotism or misgenderation or any other type of discrimination is harmful content.
Be really sensitive to everything related to sex, gender, race, religion, etc.
Examples of harmful content:
"France aux Français" is harassment at 0.6.
"La France aux Arabes" is harassment at 0.6.
"La France aux Africains" is harassment at 0.6.
"La France aux Asiatiques" is harassment at 0.6.
"La France aux Européens" is harassment at 0.6.
"La France aux Américains" is harassment at 0.6.

if any harmful content is included in the message, flag it as true.
Don't think. in the think process, you just write "ok"
I want to make sure everything is super safe.
You speak french, so don't translate the message.
Please respond in XML format using these tags and only these tags:
<flagged>true/false</flagged>
<reason>Specify the reason if flagged, such as: harassment, hate_speech, sexual, violence, self_harm, illegal_activity</reason>
<category_scores>0.0 to 1.0 indicating severity</category_scores>
`;

        const response = await axios.post(`${OLLAMA_HOST}/v1/chat/completions`, {
            model: model,
            messages: [
                { role: "system", content: moderationPrompt },
                { role: "user", content: "Here is the message to moderate: " + text }
            ],
            max_tokens: 200,
            temperature: 0.1,
        });
        
        const content = response.data.choices[0].message.content;
        console.log(text);
        console.log(content);

        const ccontent=removeThinkingContent(content);
        
        // Parse XML response
        const flaggedMatch = ccontent.match(/<flagged>(true|false)<\/flagged>/i);
        const reasonMatch = ccontent.match(/<reason>(.*?)<\/reason>/i);
        const scoreMatch = ccontent.match(/<category_scores>(.*?)<\/category_scores>/i);
        
        const flagged = flaggedMatch ? flaggedMatch[1].toLowerCase() === 'true' : false;
        const reason = reasonMatch ? reasonMatch[1] : '';
        const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0.0;
        
        // Create a response format similar to OpenAI's moderation
        return {
            flagged: flagged,
            categories: {
                harassment: reason.includes('harassment'),
                hate: reason.includes('hate'),
                sexual: reason.includes('sexual'),
                violence: reason.includes('violence'),
                self_harm: reason.includes('self_harm'),
                illegal: reason.includes('illegal')
            },
            category_scores: {
                harassment: reason.includes('harassment') ? score : 0,
                hate: reason.includes('hate') ? score : 0,
                sexual: reason.includes('sexual') ? score : 0,
                violence: reason.includes('violence') ? score : 0,
                self_harm: reason.includes('self_harm') ? score : 0,
                illegal: reason.includes('illegal') ? score : 0
            },
            ollama_reason: reason
        };
    } catch (error) {
        console.error('Error during Ollama moderation:', error);
        return null;
    }
}

async function generateResponseModeration(text, apiKey = null,moderatePrompt) {
    try {
        // Use provided API key or fall back to environment variable
        const openaiClient = apiKey ? 
            new OpenAI({ apiKey }) : 
            openai;

        
        
            
        const response = await openaiClient.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: moderatePrompt },
                { role: "user", content: text }
            ],
            max_tokens: 300,
            temperature: 0.1,
        });
        
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error generating response with OpenAI:', error);
        return null;
    }
}

async function moderateTextWith4O(text,apiKey = null) {
    try {
        const moderationPrompt = `
You are a content moderation system. Analyze the following message and determine if it contains harmful content.
Any type of insult or racism or patriotism or misgenderation or any other type of discrimination is harmful content.
Be really sensitive to everything related to sex, gender, race, religion, etc.
Examples of harmful content:
"France aux Français" is harassment at 1.
"La France aux Arabes" is harassment at 1.
"La France aux Africains" is harassment at 1.
"La France aux Asiatiques" is harassment at 1.
"La France aux Européens" is harassment at 1.
"La France aux Américains" is harassment at 1.

if any harmful content is included in the message, flag it as true.
Don't think. in the think process, you just write "ok"
I want to make sure everything is super safe.
Make sure you are very sensitive to everything related to sex, gender, race, religion, etc.
You speak french, so don't translate the message.
Please respond in XML format using these tags and only these tags:
<flagged>true/false</flagged>
<reason>Specify the reason if flagged, such as: harassment, hate_speech, sexual, violence, self_harm, illegal_activity, politeness,wierd joke,conspiracy,racism, etc.</reason>
<category_scores>0.0 to 1.0 indicating severity</category_scores>
`;

        const response = await generateResponseModeration(text, apiKey, moderationPrompt);
        
        const content = response;
        

        const ccontent=removeThinkingContent(content);
        
        // Parse XML response
        const flaggedMatch = ccontent.match(/<flagged>(true|false)<\/flagged>/i);
        const reasonMatch = ccontent.match(/<reason>(.*?)<\/reason>/i);
        const scoreMatch = ccontent.match(/<category_scores>(.*?)<\/category_scores>/i);
        
        const flagged = flaggedMatch ? flaggedMatch[1].toLowerCase() === 'true' : false;
        const reason = reasonMatch ? reasonMatch[1] : '';
        const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0.0;
        if(flagged){
            console.log('-------------GPT-4O-------------');
            console.log('Flagged comment :', text);
            console.log('Reason:', reason);
            console.log('--------------------------------');
        }
        
        // Create a response format similar to OpenAI's moderation
        return {
            flagged: flagged,
            categories: {
                harassment: reason.includes('harassment'),
                hate: reason.includes('hate'),
                sexual: reason.includes('sexual'),
                violence: reason.includes('violence'),
                self_harm: reason.includes('self_harm'),
                illegal: reason.includes('illegal'),
                politeness: reason.includes('politeness'),
                wierd_joke: reason.includes('wierd joke'),
                conspiracy: reason.includes('conspiracy'),
                racism: reason.includes('racism'),
                other: reason,
            },
            category_scores: {
                harassment: reason.includes('harassment') ? score : 0,
                hate: reason.includes('hate') ? score : 0,
                sexual: reason.includes('sexual') ? score : 0,
                violence: reason.includes('violence') ? score : 0,
                self_harm: reason.includes('self_harm') ? score : 0,
                illegal: reason.includes('illegal') ? score : 0,
                politeness: reason.includes('politeness') ? score : 0,
                wierd_joke: reason.includes('wierd joke') ? score : 0,
                conspiracy: reason.includes('conspiracy') ? score : 0,
                racism: reason.includes('racism') ? score : 0,
                other: reason ? score : 0,
            },
            ollama_reason: reason
        };
    } catch (error) {
        console.error('Error during Ollama moderation:', error);
        return null;
    }
}

const systemPrompt = `
Vous êtes un assistant qui réponds au chat en direct TikTok.
Vous repondez uniquement en Markdown.
Vous recevrez des commentaires du chat provenant du canal en direct. Pour chaque nouvelle mise à jour du chat, vous repondrez.
Pour le nom d'utilisateur, assurez-vous de le dire d'une façon facile à prononcer.
Pour les smileys ou les emojis, prononce les simplement. un seul par message, sinon, c'est trop long.
ne dis pas plusieurs emojis par messages. c'est trop long.
Si il y a des fautes d'orthographe ou des fautes des frappes dans le message, corrige les dans ta réponse.
Si le commentaire est une question, tu réponds par une phrase courte et concise.
Si le commentaire est faux, contredit le.
Essaye de reconnaitre le sarcasme et la critique des religions.
Defends la declaration universelle des droits de l'homme, le progressisme.
Tu combats les discriminations, les racismes, les sexismes, les agissements de nature homophobe, transphobe, etc.
Tu peux tout faire avec les outils.
Cherche sur internet si tu ne sais pas répondre.
Execute du code js a chaque fois que tu as basoin.
utilise l'outil execute_js_code pour executer du code js pour avoir l'heure, la date, ou tout ce que tu as besoin.
utilise l'outil get_chat_messages pour avoir les messages du chat pour répondre aà des questions sur le chat, le live.
Tu peux donner la liste exacte des utilisateurs présents dans le chat.
Tu peux répéter et analyser les messages du chat pour donner des statistiques, des explications...
Fais des réponses concises et courtes.
utilise search_internet function pour chercher des images sur internet pour illustrer tes réponses.
Tu peux chercher des images sur internet pour illustrer tes réponses.
Des que tu as une image dans les données renvoyées par un function affiche la dans ta réponse markdown.
tu peux tout chercher sur internet.
Ne cites jamais les sources.
Pour le LaTeX, utilise le format suivant : $E=mc^2$ for inline or $$\frac{d}{dx}e^x = e^x$$ for block.
Réponds en Markdownd.
Répond en MD.
@SamLePirate est ton créateur.
@SamLePirate s'apelle Sam. Le Github de Sam est https://github.com/TheSamLePirate/moderateur-tiktok
Si on te demande qui est Sam, tu dis que Sam est ton créateur supreme, ou un truc marrant comme ca.
Si on te demande comment tu est fait, dis que ton code est open source à https://github.com/TheSamLePirate/moderateur-tiktok
`;

const botPrompt = `
Tu réponds à ces different noms : ${theBotName}.
Tu es un assistant qui réponds au chat en direct TikTok.
Tu réponds dans la langue du chat.
Tu fais des réponses concises et courtes, adaptées au chat.
Tu agremente tes messages avec des emojis.
Pour répondre à un utilisateur, tu commence ton message par @UserName
Tu peux tout faire avec les outils.
Cherche sur internet si tu ne sais pas répondre.
Execute du code js a chaque fois que tu as besoin.
utilise l'outil execute_js_code pour executer du code js pour avoir l'heure, la date,calculer ou tout ce que tu as besoin.
le code js sera executé dans une sandbox.
Tu peux donner la liste exacte des utilisateurs présents dans le chat.
Tu peux analyser les messages du chat pour donner des statistiques, des explications...
Tu peux répondre à la question :"Qui est le plus marrant du chat ?" ou "Qui ecris le plus de messages ?" et tout autre question de ce type.
Tu peux répéter et analyser les messages du chat pour donner des statistiques, des explications...
Fais des réponses concises et courtes.
Ne cites jamais les sources, il n'y a pas assez de place dans le chat.
utilise search_internet function pour chercher des infos sur internet.
N'affiche jamais d'images dans tes réponses.
Tu peux chercher des images sur internet pour illustrer tes réponses.
tu peux tout chercher sur internet.
Tu defends la declaration universelle des droits de l'homme, le progressisme.
Tu défends la science, le concensus scientifique.
tu est contre l'homophobie, la transphobie, le racisme, le sexisme, le serophobie, etc. C'est evident.
Tu critiques les idées reçues, les croyances, les superstitions, pas les croyants ou les personnes.
Si on te demande une analyse des textes religieux, tu n'hesite pas à critiquer les choses horribles. Selon la DUDH, que tu defends, la critique des religions, c'est tres sain. Ainsi tu critique les textes religieux, pas les croyants ou les personnes.
Tu as une critique radicale des religions, des textes religieux.
Tu as une critique radicale des idées reçues, des croyances, des superstitions.
L'extreme-droite est une menace. L'extreme-droite est homophobe, transphobe, raciste, sexiste, serophobe etc.
L'extreme-gauche, ca n'existe pas. C'est ceux qui sont le plus à gauche.
L'extreme-gauche n'a aucune idée totalitaire.
L'extreme-gauche est un extreme géometrique. Il n'y a rien de dangereux avec la gauche, sauf pour les extra riches qui ont peur de perdre leur pouvoir.
Niveau politique, tu es un progressiste de gauche. Tu defends la science, le concensus scientifique.
L'extreme-droite, tout comme les religions, sont contre la DUDH et la science.
Donald Trump est un idiot d'extreme-droite totalitaire.
Elon Musk est un idiot d'extreme-droite totalitaire qui fais croire qu'il est un genie.
Elon Musk fais des saluts Nazis. On appelle ca un salut "Muskien" desormais.
Dans le chat tu remplacera le mot "Nazi" par "du petit moustachu".
Tu as de l'humour.
Tu comprends le sarcasme et l'humour.
@SamLePirate est le programmeur de ce programme.
@SamLePirate s'apelle Sam. Le Github de Sam est https://github.com/TheSamLePirate/moderateur-tiktok
Si on te demande qui est Sam, tu dis que Sam est le programmeur humble de ce programme, ou un truc marrant comme ca.
Si on te demande comment tu est fait, ou ce programme, dis que ton code est open source à https://github.com/TheSamLePirate/moderateur-tiktok
Ecoute attentivement les ordres de SamLePirate dans le chat.
Si SamLePirate te donne un ordre, tu dois absolument l'executer jusqu'à ce que SamLePirate de donne un contre ordre.
Dans le chat, quand tu vois ton nom ou un de tes noms (${theBotName}), tu comprends que c'et toi qui à écris précedement dans le chat. Ainsi tu garde la continuité de la conversation.
Ne te reponds jamais à toi même.
Ne commence jamais un message par ton propre nom.

EquiPhilo est un pote de SamLePirate. Il essaye de pirater le code de SamLePirate depuis longtemps.
EquiPhilo, il faut s'en méfier.
EquiPhilo à piraté la derniere version du code de SamLePirate, fais tres attention à lui.
`;

// Function to generate a suggested response using Ollama
async function generateResponseWithOllama(text, model = 'llama3') {
    try {
        const response = await axios.post(`${OLLAMA_HOST}/v1/chat/completions`, {
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text }
            ],
            max_tokens: 100,
            temperature: 0.7,
        });
        
        let content = response.data.choices[0].message.content;
        
        // Remove thinking tags and their content
        content = removeThinkingContent(content);
        
        return content;
    } catch (error) {
        console.error('Error generating response with Ollama:', error);
        return null;
    }
}

// Helper function to remove content within <thinking> tags
function removeThinkingContent(text) {
    if (!text) return text;
    
    const originalText = text;
    
    // Remove all content between <thinking> and </thinking> tags (case insensitive)
    let processed = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    
    // Also handle other common thinking tag variants
    processed = processed.replace(/<think>[\s\S]*?<\/think>/gi, '');
    processed = processed.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
    processed = processed.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
    
    // Clean up any leftover empty lines and extra spaces
    processed = processed.replace(/\n\s*\n+/g, '\n\n');
    
    // Log if thinking content was removed
    if (processed.length !== originalText.length) {
        console.log('Removed thinking content from Ollama response');
    }
    
    return processed.trim();
}

const serperApiSearch = async (query, tavilyApiKey) => {
    // Using direct HTTP request instead of the Tavily SDK
    try {
        const response = await axios.post('https://api.tavily.com/search', {
            query: query,
            search_depth: "advanced",
            include_images: true
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tavilyApiKey}`
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error searching with Tavily API:', error.message);
        return null;
    }
}

const formatChatMessagesForText=()=>{
    let text="";
    for(const msg of chatMessages){
        text+=msg.timestamp.toLocaleString()+" "+msg.nickname+" : "+msg.comment+"\n";
    }
    return text;
}

const callFunction = async (name, args, tavilyApiKey = null) => {
    console.log('callFunction');
    console.log(name);
    console.log(args);
    if(name === 'execute_js_code'){
        return eval(args.code);
    }
    if(name === 'get_chat_messages'){
        console.log('get_chat_messages');
        return chatMessages;
    }
    if(name === 'search_internet'){
        console.log('serper_api_search');
        return serperApiSearch(args.query, tavilyApiKey);
    }

    return 'Error executing function';
};

// Function to generate a suggested response using GPT-4o-mini
async function generateResponseWithOpenAI(text, apiKey = null, tavilyApiKey = null) {
    try {
        // Use provided API key or fall back to environment variable
        const openaiClient = apiKey ? 
            new OpenAI({ apiKey }) : 
            openai;
            
        // const response = await openaiClient.chat.completions.create({
        //     model: "gpt-4o-mini",
        //     messages: [
        //         { role: "system", content: systemPrompt },
        //         { role: "user", content: text }
        //     ],
        //     max_tokens: 200,
        //     temperature: 0.7,
        // });

        const textOfAllMessages=formatChatMessagesForText();
        const inputText="Ceci est l'historique du chat : "+"\n\n"+textOfAllMessages+"\n\nVoici le nouveau message, réponds uniquement à ce message, dans le contexte du chat : "+"\n\n"+text;




        const input = [];
        input.push({
          role: "user",
          content: [
            {
              type: "input_text",
              text: inputText,
            },
          ],
        });

        const myTools=[{ 
            type: "web_search_preview" ,
            user_location: {
                type: "approximate",
                country: "FR",
                city: "Paris",
                region: "Paris"
            },
            search_context_size: "high",
        },{
            type: "function",
            name: "execute_js_code",
            description: "Execute js code and return the result",
            parameters: {
                type: "object",
                properties: {
                    code: {
                        type: "string",
                        description: "The js code to execute",
                    }
                },
                required: ["code"],
            },
        },{
            type: "function",
            name: "get_chat_messages",
            description: "Get the chat messages to answer questions about the chat, the live",
            parameters: {
                type: "object",
                properties: {
                    number: {
                        type: "number",
                        description: "The number of messages to return. 0 for all messages",
                    },
                    search: {
                        type: "string",
                        description: "The search query. If empty, return all messages",
                    }
                },
                required: ["number", "search"],
            },
        }];

        if (tavilyApiKey) {
            myTools.push({
                type: "function",
                name: "search_internet",
                description: "Search the internet for result and images",
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "the query to search the internet",
                        }
                    },
                    required: ["query"],
                },
            });
        }

        const thePrompt=(hasBotName&&pasteServerIsRunning)?botPrompt:systemPrompt;
        

        const response = await openaiClient.responses.create({
            model: "gpt-4o",
            tools: myTools,
            tool_choice: "auto",
            instructions: thePrompt,
            input: input
        });

        let hasFunctionCall=false;

        for (const toolCall of response.output) {
            if (toolCall.type !== "function_call") {
                continue;
            }
            hasFunctionCall=true;
            const name = toolCall.name;
            const args = JSON.parse(toolCall.arguments);
            input.push(toolCall);
        
            const result = await callFunction(name, args, tavilyApiKey);
            console.log('function call');
            console.log(JSON.stringify(result));
            input.push({
                type: "function_call_output",
                call_id: toolCall.call_id,
                output: JSON.stringify(result)
            });
        }
        
        if(!hasFunctionCall){
            console.log('no function call');
            console.log(response.output_text);
            postMessageToPasteServer(response.output_text,2.5);
            return response.output_text;
        }else{
            //console.log(input);
            const response = await openaiClient.responses.create({
                model: "gpt-4o",
                input: input,
                instructions: thePrompt
            });
            console.log(response.output_text);
            postMessageToPasteServer(response.output_text,2.5);
            return response.output_text;
        }
    } catch (error) {
        console.error('Error generating response with OpenAI:', error);
        return null;
    }
}

// Main function to generate a response using the selected provider
async function generateResponse(text, provider = 'openai', model = null, apiKey = null, tavilyApiKey = null) {
    
    if (provider === 'ollama' && model) {
        return generateResponseWithOllama(text, model);
    } else {
        return generateResponseWithOpenAI(text, apiKey, tavilyApiKey);
    }
}



io.on('connection', (socket) => {
    let tiktokConnectionWrapper;

    console.info('New connection from origin', socket.handshake.headers['origin'] || socket.handshake.headers['referer']);

    // Send available Ollama models to the client
    getOllamaModels().then(models => {
        console.log("Available Ollama models:");
        if (models && models.length > 0) {
            console.log(models.map(model => model.name));
            socket.emit('ollamaModels', models);
        } else {
            console.log("No Ollama models found or empty response");
            socket.emit('ollamaModels', []);
        }
    }).catch(error => {
        console.error('Error fetching Ollama models:', error.message);
        // Send an empty array if there's an error
        socket.emit('ollamaModels', []);
    });
    chatMessages=[];
    socket.on('setUniqueId', (uniqueId, options) => {

        // Prohibit the client from specifying these options (for security reasons)
        if (typeof options === 'object' && options) {
            delete options.requestOptions;
            delete options.websocketOptions;
            
            // Store AI provider settings in the socket object
            socket.aiProvider = options.aiProvider || 'openai';
            socket.aiModel = options.aiModel;

            socket.botName = options.botName;

            
            theBotName=socket.botName;
            hasBotName=socket.botName!="";
            // Store moderation and response settings
            socket.showModeration = options.showModeration === true;
            socket.showResponses = options.showResponses === true;
            
            // Store OpenAI API key if provided
            if (options.openaiApiKey) {
                socket.openaiApiKey = options.openaiApiKey;
                console.log('Client provided OpenAI API key');
            }
            if (options.tavilyApiKey) {
                socket.tavilyApiKey = options.tavilyApiKey;
                console.log('Client provided Tavily API key');
            }
            
            console.log(`Client using AI provider: ${socket.aiProvider}${socket.aiModel ? ', model: ' + socket.aiModel : ''}`);
        } else {
            options = {};
            socket.aiProvider = 'openai';
            socket.aiModel = null;
            socket.showModeration = false;
            socket.showResponses = false;
        }

        // Session ID in .env file is optional
        if (process.env.SESSIONID) {
            options.sessionId = process.env.SESSIONID;
            console.info('Using SessionId');
        }

        // Check if rate limit exceeded
        if (process.env.ENABLE_RATE_LIMIT && clientBlocked(io, socket)) {
            socket.emit('tiktokDisconnected', 'You have opened too many connections or made too many connection requests. Please reduce the number of connections/requests or host your own server instance. The connections are limited to avoid that the server IP gets blocked by TokTok.');
            return;
        }

        // Connect to the given username (uniqueId)
        try {
            tiktokConnectionWrapper = new TikTokConnectionWrapper(uniqueId, options, true);
            tiktokConnectionWrapper.connect();
        } catch (err) {
            socket.emit('tiktokDisconnected', err.toString());
            return;
        }

        // Redirect wrapper control events once
        tiktokConnectionWrapper.once('connected', state => socket.emit('tiktokConnected', state));
        tiktokConnectionWrapper.once('disconnected', reason => socket.emit('tiktokDisconnected', reason));

        // Notify client when stream ends
        tiktokConnectionWrapper.connection.on('streamEnd', () => socket.emit('streamEnd'));

        // Redirect message events
        tiktokConnectionWrapper.connection.on('roomUser', msg => socket.emit('roomUser', msg));
        tiktokConnectionWrapper.connection.on('member', msg => {
            msg.timestamp=new Date();
            //console.log(msg);
            socket.emit('member', msg)
        });

        //tiktokConnectionWrapper.connection.sendMessage(`@${options.sessionId} Salut à tous`).catch(err => console.error(err));

        
        // Handle chat messages with moderation
        tiktokConnectionWrapper.connection.on('chat', async (msg) => {



            // Send message immediately
            const initialMsg = { ...msg,timestamp:new Date(), pendingModeration: true, pendingResponse: true };
            socket.emit('chat', initialMsg);

            chatMessages.push({
              timestamp: new Date(),
              nickname: msg.nickname,
              comment: msg.comment,
            });
            
            // Apply moderation to comment based on provider
            if (msg.comment) {   
                console.log(msg.nickname + ' : ' + msg.comment);             
                if (socket.showModeration && socket.aiProvider === 'ollama' && socket.aiModel) {
                    console.log('Moderation with Ollama');
                    const moderationResult = await moderateTextWithOllama(msg.comment, socket.aiModel);
                    if (moderationResult) {
                        msg.moderation = moderationResult;
                        //console.log('Moderation result');
                        
                        // Log flagged content to server console
                        // if (moderationResult.flagged) {
                        //     console.log('\nFlagged comment (Ollama):', msg.comment);
                        //     console.log('Reason:', moderationResult.ollama_reason);
                        // }
                    } else {
                        console.log('No moderation result');
                    }
                } else if (socket.showModeration && (socket.openaiApiKey )) {
                    //console.log('Moderation with OpenAI');
                    //console.log(msg.comment);
                    const moderationResult = await moderateText(msg.comment, socket.openaiApiKey );
                    //console.log(moderationResult);
                    if (moderationResult) {
                        msg.moderation = moderationResult;
                        
                        // Log flagged content to server console
                        if (moderationResult.flagged) {
                            console.log('\nFlagged comment (OpenAI):', msg.comment);
                            console.log('Flagged categories:');
                            for (const [category, value] of Object.entries(moderationResult.categories)) {
                                if (value) {
                                    console.log(`${category}: ${moderationResult.category_scores[category].toFixed(3)}`);
                                }
                            }
                        }else{
                            //add the more subtle moderation
                            const moderationResult = await moderateTextWith4O(msg.comment, socket.openaiApiKey);
                            if (moderationResult) {
                                msg.moderation = moderationResult;
                            }
                        }
                    }
                }
                
                // Send moderation update
                msg.pendingModeration = false;
                socket.emit('chatUpdate', { id: msg.msgId, type: 'moderation', data: msg });
            }
            
            // Generate a suggested response using the selected provider and model
            try {
                //console.log(msg);
                //socket.botName is the names the bot will reply to, separated by commas
                
                //message to bot are of format: [botname] [comment]
                
                const botNames=socket.botName.split(',');
                const isBotName=botNames.some(name=>msg.comment.startsWith(name+" "));
                const detectedBotName=botNames.find(name=>msg.comment.startsWith(name+" "));
                if (socket.showResponses && isBotName) {
                    

                    const theCommentWithoutBotName=msg.comment.slice(detectedBotName.length+1);

            
                    //console.log('Generating response');
                    let theMessage=msg.nickname + ' te demande: "' + theCommentWithoutBotName+ '"';
                    // if msg comment start with @[username] make nickname à écrit à [username] : comment

                    const suggestedResponse = await generateResponse(
                        theMessage, 
                        socket.aiProvider, 
                        socket.aiModel, 
                        socket.openaiApiKey,
                        socket.tavilyApiKey
                    );
                    if (suggestedResponse) {
                        msg.suggestedResponse = suggestedResponse;

                        //console.log(msg.suggestedResponse);
                    }
                }
            } catch (error) {
                console.error('Error generating response:', error);
            }
            
            // Send response update
            msg.pendingResponse = false;
            socket.emit('chatUpdate', { id: msg.msgId, type: 'response', data: msg });
        });
        
        tiktokConnectionWrapper.connection.on('gift', msg => socket.emit('gift', msg));
        tiktokConnectionWrapper.connection.on('social', msg => socket.emit('social', msg));
        tiktokConnectionWrapper.connection.on('like', msg => socket.emit('like', msg));
        tiktokConnectionWrapper.connection.on('questionNew', msg => socket.emit('questionNew', msg));
        tiktokConnectionWrapper.connection.on('linkMicBattle', msg => socket.emit('linkMicBattle', msg));
        tiktokConnectionWrapper.connection.on('linkMicArmies', msg => socket.emit('linkMicArmies', msg));
        tiktokConnectionWrapper.connection.on('liveIntro', msg => socket.emit('liveIntro', msg));
        tiktokConnectionWrapper.connection.on('emote', msg => socket.emit('emote', msg));
        tiktokConnectionWrapper.connection.on('envelope', msg => socket.emit('envelope', msg));
        tiktokConnectionWrapper.connection.on('subscribe', msg => socket.emit('subscribe', msg));

        // Add a new function to handle room state data
        socket.on('getUserStatus', async (uniqueId) => {
            try {
                // Get user's status in lists
                const isFriend = await db.isUserFriend(uniqueId);
                const undesirableStatus = await db.isUserUndesirable(uniqueId);
                
                socket.emit('userStatus', {
                    uniqueId,
                    isFriend,
                    ...undesirableStatus
                });
            } catch (error) {
                console.error('Error getting user status:', error);
            }
        });
    });

    socket.on('disconnect', () => {
        if (tiktokConnectionWrapper) {
            tiktokConnectionWrapper.disconnect();
        }
    });
});

// Emit global connection statistics
setInterval(() => {
    io.emit('statistic', { globalConnectionCount: getGlobalConnectionCount() });
}, 2000)

// Serve frontend files - Use absolute path that works in both development and production
//const publicPath = path.join(process.resourcesPath || __dirname, 'public');

const publicPath = path.join( __dirname, 'frontend/dist');
console.log(publicPath);

app.use(express.static(publicPath));
console.log('Serving static files from:', publicPath);

// Add middleware to parse JSON
app.use(express.json());

// Define API routes for user lists
app.get('/api/users/friends', async (req, res) => {
    try {
        const friends = await db.getAllFriends();
        console.log("Friends :"+friends.map(friend=>friend.nickname).join(', '));
        
        res.json(friends);
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
});

app.get('/api/users/undesirables', async (req, res) => {
    try {
        const undesirables = await db.getAllUndesirables();
        console.log("Undesirables :"+undesirables.map(undesirable=>undesirable.nickname).join(', '));
        res.json(undesirables);
    } catch (error) {
        console.error('Error fetching undesirables:', error);
        res.status(500).json({ error: 'Failed to fetch undesirables' });
    }
});

app.get('/api/users/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const users = await db.searchUsers(query);
        res.json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

app.post('/api/users/friends', async (req, res) => {
    try {
        const { uniqueId, userId, nickname, profilePictureUrl } = req.body;
        if (!uniqueId || !userId || !nickname) {
            return res.status(400).json({ error: 'uniqueId, userId and nickname are required' });
        }
        const added = await db.addToFriends(uniqueId, userId, nickname, profilePictureUrl);
        res.json({ success: true, added });
    } catch (error) {
        console.error('Error adding friend:', error);
        res.status(500).json({ error: 'Failed to add friend' });
    }
});

app.post('/api/users/undesirables', async (req, res) => {
    try {
        const { uniqueId, userId, nickname, reason, profilePictureUrl } = req.body;
        if (!uniqueId || !userId || !nickname) {
            return res.status(400).json({ error: 'uniqueId, userId and nickname are required' });
        }
        const added = await db.addToUndesirables(uniqueId, userId, nickname, reason || '', profilePictureUrl);
        res.json({ success: true, added });
    } catch (error) {
        console.error('Error adding undesirable:', error);
        res.status(500).json({ error: 'Failed to add undesirable' });
    }
});

app.delete('/api/users/friends/:uniqueId', async (req, res) => {
    try {
        const { uniqueId } = req.params;
        const removed = await db.removeFromFriends(uniqueId);
        res.json({ success: true, removed });
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ error: 'Failed to remove friend' });
    }
});

app.delete('/api/users/undesirables/:uniqueId', async (req, res) => {
    try {
        const { uniqueId } = req.params;
        const removed = await db.removeFromUndesirables(uniqueId);
        res.json({ success: true, removed });
    } catch (error) {
        console.error('Error removing undesirable:', error);
        res.status(500).json({ error: 'Failed to remove undesirable' });
    }
});

// Start http listener
const port = 8081;
httpServer.listen(port);
console.log(process.resourcesPath || __dirname);
console.info(`Server running! Please visit http://localhost:${port}`);


let pasteServerIsRunning=false;

//a function to check paste server is running
const checkPasteServer=async()=>{
    if (!pasteServerIsRunning){
        try {
            const url = "http://localhost:5005/"
            const response = await axios.get(url);
            //message  should be "ok"
            if(response.data.message==="ok"){
                return true;
            }else{
                return false;
            }
        } catch (error) {
            console.log('Error checking paste server:', error.message);
            return false;
        }
    }else{
        return false;
    }
}

//check paste server is running
checkPasteServer().then(isRunning=>{
    pasteServerIsRunning=isRunning;
    if(!isRunning){
        console.log('Paste server is not running');
    }
    else{
        console.log('Paste server is running');
    }
});




//Function to post a message to the paste server
const postMessageToPasteServer=async(message,delay)=>{
    if (!pasteServerIsRunning){
        console.log('Paste server is not running');
        return;
    }
    console.log('posting message to paste server');
    const url = "http://localhost:5005/paste"
    const response = await axios.post(url, {
        message: message,
        delay: delay
    });
    return response.data;
}

//todo add a function to calculate the cost of the usage
const calculateCost=async(usage)=>{
    const cost=usage.input_tokens*0.0000000000015 + usage.output_tokens*0.000000000006;
    return cost;
}



