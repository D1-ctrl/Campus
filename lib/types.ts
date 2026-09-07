export type Document = {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  university: string;
  subject_id: string | null;
  document_type: string;
  file_url: string;
  uploader_id: string;
  is_anonymous: boolean;
  download_count: number;
  thumbnail_url: string | null;
  created_at: string;
};

export type SemesterType = "WiSe" | "SoSe";
export type DegreeGoal = "Bachelor" | "Master";

export type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  university: string | null;
  download_credits: number;
  created_at: string;
  university_id: string | null;
  study_program_id: string | null;
  start_semester_type: SemesterType | null;
  start_semester_year: number | null;
  degree_goal: DegreeGoal | null;
  avatar_url: string | null;
  onboarding_completed_at: string | null;
  is_admin: boolean;
};

export type University = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type StudyProgram = {
  id: string;
  university_id: string;
  name: string;
  created_at: string;
};

export type Subject = {
  id: string;
  university_id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  professor_name: string | null;
  next_exam_date: string | null;
};

export type WaitlistEntry = {
  id: string;
  name: string | null;
  email: string;
  university_name: string;
  created_at: string;
};

export type ContentReport = {
  id: string;
  reporter_id: string;
  target_type: "post" | "comment" | "document";
  target_id: string;
  reason: string;
  resolved: boolean;
  created_at: string;
};

export type PostScope = "profile" | "uni";

export type Post = {
  id: string;
  university_id: string;
  subject_id: string | null;
  group_id: string | null;
  author_id: string;
  is_anonymous: boolean;
  body: string;
  image_url: string | null;
  scope: PostScope;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  university_id: string | null;
  created_by: string;
  created_at: string;
};

export type Story = {
  id: string;
  university_id: string;
  author_id: string;
  image_url: string;
  highlight_title: string | null;
  created_at: string;
};

export type ScheduleEvent = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  event_date: string | null;
  start_time: string;
  end_time: string;
  note: string | null;
  is_recurring: boolean;
  day_of_week: number | null;
  semester_start: string | null;
  semester_end: string | null;
  remind_me: boolean;
  created_at: string;
};

export type ScheduleException = {
  id: string;
  schedule_event_id: string;
  user_id: string;
  exception_date: string;
  created_at: string;
};

export type Follow = {
  follower_id: string;
  followed_id: string;
  created_at: string;
};

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  is_anonymous: boolean;
  body: string;
  created_at: string;
};

export type Poll = {
  id: string;
  post_id: string;
  created_at: string;
};

export type PollOption = {
  id: string;
  poll_id: string;
  label: string;
  position: number;
};

export type Rating = {
  id: string;
  document_id: string;
  user_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  is_group: boolean;
  name: string | null;
  created_by: string | null;
  last_message_at: string;
  created_at: string;
};

export type ConversationParticipant = {
  conversation_id: string;
  user_id: string;
  joined_at: string;
};

export type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  shared_post_id: string | null;
  created_at: string;
  read_at: string | null;
};

export type NotificationType = "follow" | "comment" | "like";

export type Notification = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  post_id: string | null;
  created_at: string;
  read_at: string | null;
};

export type AdPlacement = "banner" | "gate";

export type Ad = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  cta_label: string | null;
  placement: AdPlacement;
  is_active: boolean;
  created_at: string;
};
