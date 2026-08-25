export async function sendAppointmentConfirmation(params: {
  studentEmail: string;
  studentName: string;
  counselorName: string;
  counselorEmail: string;
  startTime: Date;
  endTime: Date;
  meetLink: string;
  title: string;
}) {
  const formatDate = (d: Date) =>
    d.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

  console.log(
    `[EMAIL] Appointment confirmation sent to ${params.studentEmail}, ${params.counselorEmail}`
  );
  console.log(`  Title: ${params.title}`);
  console.log(`  Time: ${formatDate(params.startTime)} - ${formatDate(params.endTime)}`);
  console.log(`  Meet: ${params.meetLink}`);
}

export async function sendFeatureRequestNotification(params: {
  counselorEmail: string;
  counselorName: string;
  studentName: string;
  featureName: string;
}) {
  console.log(
    `[EMAIL] Feature request: ${params.studentName} requests ${params.featureName} from ${params.counselorName} (${params.counselorEmail})`
  );
}
