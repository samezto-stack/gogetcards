/* ── Notification Service ─────────────────────────────────
   Step 8. Internal admin notification for a new order. Channels are a
   plain list of `send(order)` functions — adding Discord/Slack/etc.
   later means pushing one more channel here, nothing upstream changes.
*/

const channels = [];

// Default channel: structured server log, always on regardless of what
// else is configured, so admin notifications never depend on outside
// services being reachable.
channels.push({
  name: 'console',
  send: async (order) => {
    console.log(
      `[NEW ORDER] #${order.orderId} — ${order.customerName} <${order.customerEmail}> — ` +
      `${(order.products && order.products[0]) || 'Unknown product'} — ` +
      `${(order.totalPrice / 100).toFixed(2)} ${order.currency} — via ${order.source}`
    );
  },
});

function registerNotificationChannel(channel) {
  channels.push(channel);
}

async function notifyAdminNewOrder(order) {
  await Promise.all(
    channels.map((channel) =>
      channel.send(order).catch((err) => {
        console.error(`[notificationService] Channel "${channel.name}" failed:`, err.message);
      })
    )
  );
}

module.exports = { notifyAdminNewOrder, registerNotificationChannel };
