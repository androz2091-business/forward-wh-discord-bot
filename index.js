import { ChannelType, Client, GatewayIntentBits, WebhookClient } from 'discord.js';
import config from './config.json' with { type: "json" };


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const getMessageOptions = (message) => {
    const messageContent = message.content;
    const messageAttachments = message.attachments.map((attachment) => attachment.url);

    const options = {
        username: message.author.displayName,
        avatarURL: message.author.displayAvatarURL(),
        content: messageContent,
        files: messageAttachments
    };

    return options;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

client.on('messageCreate', async (message) => {

    if (message.author.bot) return;

    if (message.channelId == config.continuousForwardingChannelId) {
        const webhookUrl = config.continousForwardingWebhookUrl;
        const webhookClient = new WebhookClient({ url: webhookUrl });
        await webhookClient.send(getMessageOptions(message));
    }

    console.log('Message received:', message.content);

    const matchingChannels = config.channels.filter((ch) => ch.channelId == message.channelId);
    if (matchingChannels.length === 0) return;

    console.log('Forwarding to:', matchingChannels.map(ch => ch.forwardingTo).join(', '));

    const forwardingChannelNames = matchingChannels.map(ch => ch.forwardingTo);
    const forwardingChannels = client.channels.cache.filter((ch) => ch.isTextBased() && forwardingChannelNames.includes(ch.name));

    console.log('Found forwarding channels:', forwardingChannels.size);

    for (const forwardingChannel of forwardingChannels.values()) {
        console.log('Forwarding to specific channel:', forwardingChannel.id);
        if (!forwardingChannel.isTextBased()) return;
        const webhooks = await forwardingChannel.fetchWebhooks();
        let forwardingWebhook = webhooks.find((wh) => wh.name == 'Forwarding Bot');
        if (!forwardingWebhook) {
            console.log('Webhook not found, creating...');
            const webhook = await forwardingChannel.createWebhook({
                name: 'Forwarding Bot'
            });
            console.log('Webhook created:', webhook);
            forwardingWebhook = webhook;
        }

        await forwardingWebhook.send(getMessageOptions(message))
        .then(() => {
            console.log('Message sent successfully to: ' + forwardingChannel.id);
        })
        .catch(e => {
            console.error('Failed to send message to: ' + forwardingChannel.id, e);
        });
        await sleep(5000);
    }

});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(config.token);

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});
