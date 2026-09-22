const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const processedTransactions = new Set();

app.get('/', (req, res) => {
    res.status(200).json({
        status: "online",
        service: "NetSub Webhook Service",
        message: "Server is securely listening for incoming bank transfers"
    });
});

app.post('/api/flutterwave/webhook', async (req, res) => {
    try {
        const expectedSecretHash = process.env.FLW_SECRET_HASH || "netsub_secret_hash_2026";
        const signature = req.headers['verif-hash'];

        if (!signature || signature !== expectedSecretHash) {
            console.warn(`[BLOCKED] Unauthorized request`);
            return res.status(401).json({ error: "Invalid secret hash" });
        }

        const payload = req.body;
        const eventType = payload.event || payload['event.type'];
        if (eventType !== 'charge.completed' && eventType !== 'BANK_TRANSFER_TRANSACTION') {
            return res.status(200).json({ status: "ignored" });
        }

        const transactionData = payload.data || payload;
        const transactionId = transactionData.id;
        const amount = Number(transactionData.amount);
        const customerEmail = transactionData.customer?.email;

        if (processedTransactions.has(transactionId)) {
            return res.status(200).json({ status: "success", message: "Already processed" });
        }

        processedTransactions.add(transactionId);
        console.log(`✅ [SUCCESS] Credited ₦${amount} to customer ${customerEmail}`);

        return res.status(200).json({
            status: "success",
            message: "Wallet credited successfully",
            transactionId: transactionId
        });
    } catch (error) {
        console.error("[ERROR]", error);
        return res.status(500).json({ error: "Server error" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 NetSub Webhook running on port ${PORT}`);
});
