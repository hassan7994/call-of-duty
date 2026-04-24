const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    AttachmentBuilder
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
});

// عداد التذاكر
let ticketCount = 0;

// إعدادات
const TOKEN = process.env.TOKEN; // ← التوكن من المتغيرات
const GUILD_ID = "1426187538858508340";
const STAFF_ROLE = "1426198839920164904";
const LOG_CHANNEL = "1426557823956811836";

client.once("ready", () => {
    console.log(`تم تسجيل الدخول باسم ${client.user.tag}`);
});

// رسالة فتح التذكرة
client.on("messageCreate", async message => {
    if (message.content === "!تذكرة") {

        const embed = new EmbedBuilder()
            .setColor(0x00AEFF)
            .setTitle("🎫 نظام التذاكر")
            .setDescription("اضغط على الزر بالأسفل لفتح تذكرة دعم فني.");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("open_ticket")
                .setLabel("فتح تذكرة")
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// فتح التذكرة
client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "open_ticket") {
        const guild = client.guilds.cache.get(GUILD_ID);

        // 🔒 منع فتح أكثر من تذكرة لنفس الشخص
        const existing = guild.channels.cache.find(c =>
            c.name.startsWith("ticket-") &&
            c.permissionOverwrites.cache.has(interaction.user.id)
        );

        if (existing) {
            return interaction.reply({
                content: "❌ لديك تذكرة مفتوحة بالفعل!",
                ephemeral: true
            });
        }

        // زيادة رقم التذكرة
        ticketCount++;

        const channel = await guild.channels.create({
            name: `ticket-${ticketCount}`,
            type: 0,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id: STAFF_ROLE,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages
                    ]
                }
            ]
        });

        const embed = new EmbedBuilder()
            .setColor(0x00FF88)
            .setTitle(`🎟️ تم فتح تذكرتك رقم ${ticketCount}`)
            .setDescription("أهلاً بك! الرجاء شرح مشكلتك وسيتم مساعدتك قريبًا.");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("إغلاق التذكرة")
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });

        await interaction.reply({ content: "✅ تم فتح تذكرتك!", ephemeral: true });

        // 📥 لوق فتح التذكرة
        const logChannel = guild.channels.cache.get(LOG_CHANNEL);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0x00AEFF)
                .setTitle("📥 تم فتح تذكرة جديدة")
                .addFields(
                    { name: "👤 صاحب التذكرة", value: `${interaction.user.tag}` },
                    { name: "📂 اسم الروم", value: `${channel.name}` },
                    { name: "⏰ الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                );
            logChannel.send({ embeds: [logEmbed] });
        }
    }

    // إغلاق التذكرة + لوق كامل
    if (interaction.customId === "close_ticket") {

        const guild = client.guilds.cache.get(GUILD_ID);
        const logChannel = guild.channels.cache.get(LOG_CHANNEL);

        // جمع الرسائل
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        let transcript = `Transcript for ${interaction.channel.name}\n\n`;

        sorted.forEach(msg => {
            transcript += `[${new Date(msg.createdTimestamp).toLocaleString()}] ${msg.author?.tag || "Unknown"}: ${msg.content}\n`;
        });

        const file = new AttachmentBuilder(Buffer.from(transcript), { name: `${interaction.channel.name}.txt` });

        // إرسال اللوق
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("📤 تم إغلاق تذكرة")
                .addFields(
                    { name: "📂 اسم الروم", value: `${interaction.channel.name}` },
                    { name: "⏰ الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                );

            logChannel.send({ embeds: [logEmbed], files: [file] });
        }

        await interaction.channel.send("🔒 سيتم إغلاق التذكرة خلال 5 ثواني…");
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
    }
});

client.login(TOKEN);
