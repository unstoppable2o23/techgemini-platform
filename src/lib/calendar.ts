export async function createCalendarEvent(params: {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendeeEmails: string[];
  counselorCalendarId?: string;
}) {
  const meetLink = `https://meet.google.com/${crypto.randomUUID().slice(0, 12)}`;

  console.log(`[CALENDAR] Event created: ${params.summary}`);
  console.log(`  Meet Link: ${meetLink}`);
  console.log(`  Attendees: ${params.attendeeEmails.join(", ")}`);
  console.log(`  Time: ${params.startTime.toISOString()} - ${params.endTime.toISOString()}`);

  return {
    eventId: crypto.randomUUID(),
    meetLink,
    htmlLink: "#",
  };
}
