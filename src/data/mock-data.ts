// Mock Data
export const initialMetrics = {
  totalContacts: 1250,
  activeConversations: 82,
  messagesSent: 25430,
  messagesReceived: 19870,
  avgResponseTime: "45s",
  flowSuccessRate: "88%",
};
export const chartData = [
  { name: "Mon", sent: 400, received: 240 },
  { name: "Tue", sent: 300, received: 139 },
  { name: "Wed", sent: 200, received: 980 },
  { name: "Thu", sent: 278, received: 390 },
  { name: "Fri", sent: 189, received: 480 },
  { name: "Sat", sent: 239, received: 380 },
  { name: "Sun", sent: 349, received: 430 },
];
export const initialFlows = [
  {
    id: 1,
    name: "Welcome Flow",
    trigger: "/welcome",
    status: "Active",
    lastModified: "2024-08-20",
  },
  {
    id: 2,
    name: "Support Ticket",
    trigger: "support",
    status: "Draft",
    lastModified: "2024-08-18",
  },
  {
    id: 3,
    name: "Product Inquiry",
    trigger: "product",
    status: "Active",
    lastModified: "2024-08-15",
  },
  {
    id: 4,
    name: "Appointment Booking",
    trigger: "book",
    status: "Inactive",
    lastModified: "2024-07-30",
  },
];
export const initialLogs = [
  {
    id: 1,
    contact: "John Doe (+1...1234)",
    flow: "Welcome Flow",
    timestamp: "2024-08-21 10:30 AM",
    status: "Completed",
  },
  {
    id: 2,
    contact: "Jane Smith (+44...5678)",
    flow: "Support Ticket",
    timestamp: "2024-08-21 10:25 AM",
    status: "In Progress",
  },
  {
    id: 3,
    contact: "Peter Jones (+1...9012)",
    flow: "Product Inquiry",
    timestamp: "2024-08-21 10:15 AM",
    status: "Error",
  },
  {
    id: 4,
    contact: "Mary Williams (+1...3456)",
    flow: "Welcome Flow",
    timestamp: "2024-08-21 10:05 AM",
    status: "Completed",
  },
  {
    id: 5,
    contact: "David Brown (+44...7890)",
    flow: "Appointment Booking",
    timestamp: "2024-08-21 09:55 AM",
    status: "Completed",
  },
];
export const initialContacts = [
  {
    id: 1,
    name: "John Doe",
    phone: "+1 555-123-1234",
    tags: ["VIP", "New"],
    lastContact: "2024-08-21",
  },
  {
    id: 2,
    name: "Jane Smith",
    phone: "+44 20-7946-0958",
    tags: ["Support"],
    lastContact: "2024-08-21",
  },
  {
    id: 3,
    name: "Peter Jones",
    phone: "+1 555-901-9012",
    tags: ["Lead"],
    lastContact: "2024-08-20",
  },
  {
    id: 4,
    name: "Mary Williams",
    phone: "+1 555-345-3456",
    tags: [],
    lastContact: "2024-08-19",
  },
  {
    id: 5,
    name: "David Brown",
    phone: "+44 20-7946-0123",
    tags: ["Customer"],
    lastContact: "2024-08-18",
  },
];
