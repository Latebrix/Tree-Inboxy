/**
 * Demo data simulating a real inbox hierarchy.
 * Used when clicking "Demo" on the setup screen.
 */
export const DEMO_HIERARCHY = [
    {
        id: "linkedin.com",
        name: "linkedin.com",
        color: "#0A66C2",
        children: [
            {
                id: "messages.linkedin.com",
                name: "messages.linkedin.com",
                children: [
                    { id: "john.doe@messages.linkedin.com", name: "John Doe", unread: 45, read: 120 },
                    { id: "jane.smith@messages.linkedin.com", name: "Jane Smith", unread: 20, read: 80 },
                ],
            },
            {
                id: "notifications.linkedin.com",
                name: "notifications.linkedin.com",
                children: [
                    { id: "alerts@notifications.linkedin.com", name: "LinkedIn Alerts", unread: 150, read: 300 },
                ],
            },
        ],
    },
    {
        id: "github.com",
        name: "github.com",
        color: "#24292e",
        children: [
            {
                id: "notifications.github.com",
                name: "notifications.github.com",
                children: [
                    { id: "ci-actions@github.com", name: "CI Actions", unread: 80, read: 150 },
                    { id: "mentions@github.com", name: "Mentions", unread: 30, read: 40 },
                ],
            },
            {
                id: "noreply.github.com",
                name: "noreply.github.com",
                children: [
                    { id: "marketing@github.com", name: "GitHub Marketing", unread: 5, read: 10 },
                ],
            },
        ],
    },
    {
        id: "amazon.com",
        name: "amazon.com",
        color: "#FF9900",
        children: [
            {
                id: "orders.amazon.com",
                name: "orders.amazon.com",
                children: [
                    { id: "update@orders.amazon.com", name: "Order Updates", unread: 12, read: 50 },
                    { id: "tracking@orders.amazon.com", name: "Tracking", unread: 8, read: 20 },
                ],
            },
            {
                id: "promotions.amazon.com",
                name: "promotions.amazon.com",
                children: [
                    { id: "deals@promotions.amazon.com", name: "Deals", unread: 90, read: 110 },
                ],
            },
        ],
    },
    {
        id: "google.com",
        name: "google.com",
        color: "#EA4335",
        children: [
            {
                id: "alerts.google.com",
                name: "alerts.google.com",
                children: [
                    { id: "security-alerts@google.com", name: "Security Alerts", unread: 2, read: 15 },
                    { id: "new-login@google.com", name: "Login Alerts", unread: 1, read: 5 },
                ],
            },
            {
                id: "workspace.google.com",
                name: "workspace.google.com",
                children: [
                    { id: "updates@workspace.google.com", name: "Workspace Updates", unread: 25, read: 80 },
                ],
            },
        ],
    },
    {
        id: "figma.com",
        name: "figma.com",
        color: "#F24E1E",
        children: [
            {
                id: "comments.figma.com",
                name: "comments.figma.com",
                children: [
                    { id: "team-mentions@figma.com", name: "Team Mentions", unread: 40, read: 60 },
                ],
            },
        ],
    },
    {
        id: "notion.so",
        name: "notion.so",
        color: "#000000",
        children: [
            {
                id: "notify.notion.so",
                name: "notify.notion.so",
                children: [
                    { id: "updates@notify.notion.so", name: "Page Updates", unread: 15, read: 35 },
                ],
            },
        ],
    },
    {
        id: "stripe.com",
        name: "stripe.com",
        color: "#635BFF",
        children: [
            {
                id: "receipts.stripe.com",
                name: "receipts.stripe.com",
                children: [
                    { id: "receipts@stripe.com", name: "Payment Receipts", unread: 3, read: 22 },
                ],
            },
        ],
    },
    {
        id: "vercel.com",
        name: "vercel.com",
        color: "#000000",
        children: [
            {
                id: "notifications.vercel.com",
                name: "notifications.vercel.com",
                children: [
                    { id: "deploys@vercel.com", name: "Deploy Notifications", unread: 6, read: 18 },
                ],
            },
        ],
    },
    {
        id: "slack.com",
        name: "slack.com",
        color: "#4A154B",
        children: [
            {
                id: "notifications.slack.com",
                name: "notifications.slack.com",
                children: [
                    { id: "digest@slack.com", name: "Daily Digest", unread: 2, read: 30 },
                ],
            },
        ],
    },
];

/**
 * Pre-defined domain colors for demo mode (bypasses favicon fetch).
 */
export function getDemoDomainColors() {
    const colors = new Map();
    for (const node of DEMO_HIERARCHY) {
        colors.set(node.id, {
            color: node.color,
            faviconUrl: `https://www.google.com/s2/favicons?domain=${node.id}&sz=64`,
        });
    }
    return colors;
}
