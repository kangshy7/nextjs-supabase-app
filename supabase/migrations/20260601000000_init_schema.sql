-- ============================================================
-- 모임 이벤트 관리 앱 — 전체 DB 스키마 마이그레이션
-- Supabase 대시보드 > SQL Editor 에서 실행
-- ============================================================

-- ─────────────────────────────────────────
-- 1. updated_at 자동 갱신 함수
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────
-- 2. events 테이블
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL CHECK (char_length(title) <= 100),
  category         TEXT NOT NULL CHECK (category IN ('swimming','fitness','gathering','other')),
  event_date       TIMESTAMPTZ,
  location         TEXT CHECK (char_length(location) <= 200),
  max_participants INT CHECK (max_participants > 0),
  description      TEXT,
  join_code        UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','completed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 주최자 CRUD
CREATE POLICY "events_host_all" ON events
  FOR ALL USING (host_id = auth.uid());

-- 수락된 참여자 SELECT
CREATE POLICY "events_accepted_select" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_id = events.id
        AND user_id = auth.uid()
        AND status = 'accepted'
    )
  );

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────
-- 3. event_participants 테이블
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_participants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id),
  guest_name   TEXT NOT NULL CHECK (char_length(guest_name) <= 50),
  guest_email  TEXT CHECK (char_length(guest_email) <= 200),
  note         TEXT CHECK (char_length(note) <= 200),
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 로그인 사용자는 이벤트당 1회만 신청 가능
  UNIQUE (event_id, user_id)
);

ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- 비로그인(anon) 포함 누구나 INSERT
CREATE POLICY "participants_insert" ON event_participants
  FOR INSERT WITH CHECK (true);

-- 주최자: 이벤트 참여자 전체 SELECT/UPDATE
CREATE POLICY "participants_host_select" ON event_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND host_id = auth.uid())
  );

CREATE POLICY "participants_host_update" ON event_participants
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND host_id = auth.uid())
  );

-- 본인 레코드 SELECT/UPDATE(취소)
CREATE POLICY "participants_self_select" ON event_participants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "participants_self_update" ON event_participants
  FOR UPDATE USING (user_id = auth.uid());

CREATE TRIGGER participants_updated_at
  BEFORE UPDATE ON event_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────
-- 4. announcements 테이블
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  host_id    UUID NOT NULL REFERENCES auth.users(id),
  title      TEXT NOT NULL CHECK (char_length(title) <= 100),
  content    TEXT NOT NULL CHECK (char_length(content) <= 2000),
  is_pinned  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 주최자 CRUD
CREATE POLICY "announcements_host_all" ON announcements
  FOR ALL USING (host_id = auth.uid());

-- 수락된 참여자 SELECT
CREATE POLICY "announcements_accepted_select" ON announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_id = announcements.event_id
        AND user_id = auth.uid()
        AND status = 'accepted'
    )
  );

CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────
-- 5. carpool_groups 테이블
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carpool_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  driver_id  UUID NOT NULL REFERENCES event_participants(id),
  departure  TEXT NOT NULL CHECK (char_length(departure) <= 100),
  capacity   INT NOT NULL CHECK (capacity BETWEEN 1 AND 8),
  memo       TEXT CHECK (char_length(memo) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE carpool_groups ENABLE ROW LEVEL SECURITY;

-- 수락된 참여자 SELECT/INSERT
CREATE POLICY "carpool_groups_accepted_select" ON carpool_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_id = carpool_groups.event_id
        AND user_id = auth.uid()
        AND status = 'accepted'
    )
    OR EXISTS (SELECT 1 FROM events WHERE id = carpool_groups.event_id AND host_id = auth.uid())
  );

CREATE POLICY "carpool_groups_accepted_insert" ON carpool_groups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_participants
      WHERE id = driver_id AND user_id = auth.uid() AND status = 'accepted'
    )
  );

-- 드라이버 UPDATE/DELETE
CREATE POLICY "carpool_groups_driver_update" ON carpool_groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM event_participants WHERE id = driver_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "carpool_groups_driver_delete" ON carpool_groups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM event_participants WHERE id = driver_id AND user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────
-- 6. carpool_members 테이블
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carpool_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       UUID NOT NULL REFERENCES carpool_groups(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES event_participants(id),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','accepted','rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, participant_id)
);

ALTER TABLE carpool_members ENABLE ROW LEVEL SECURITY;

-- 수락된 참여자 SELECT/INSERT
CREATE POLICY "carpool_members_accepted_select" ON carpool_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM carpool_groups cg
      JOIN event_participants ep ON ep.event_id = cg.event_id
      WHERE cg.id = carpool_members.group_id
        AND ep.user_id = auth.uid()
        AND ep.status = 'accepted'
    )
    OR EXISTS (
      SELECT 1 FROM carpool_groups cg
      JOIN events e ON e.id = cg.event_id
      WHERE cg.id = carpool_members.group_id AND e.host_id = auth.uid()
    )
  );

CREATE POLICY "carpool_members_insert" ON carpool_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_participants WHERE id = participant_id AND user_id = auth.uid()
    )
  );

-- 드라이버 UPDATE
CREATE POLICY "carpool_members_driver_update" ON carpool_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM carpool_groups cg
      JOIN event_participants ep ON ep.id = cg.driver_id
      WHERE cg.id = carpool_members.group_id AND ep.user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────
-- 7. expenses 테이블
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  description TEXT NOT NULL CHECK (char_length(description) <= 100),
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_by     UUID NOT NULL REFERENCES event_participants(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 주최자 CRUD
CREATE POLICY "expenses_host_all" ON expenses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND host_id = auth.uid())
  );

-- 수락된 참여자 SELECT
CREATE POLICY "expenses_accepted_select" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_id = expenses.event_id
        AND user_id = auth.uid()
        AND status = 'accepted'
    )
  );


-- ─────────────────────────────────────────
-- 8. expense_splits 테이블
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_splits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id     UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES event_participants(id),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  is_paid        BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- 주최자 INSERT/UPDATE
CREATE POLICY "splits_host_insert" ON expense_splits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses e
      JOIN events ev ON ev.id = e.event_id
      WHERE e.id = expense_id AND ev.host_id = auth.uid()
    )
  );

CREATE POLICY "splits_host_update" ON expense_splits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM expenses e
      JOIN events ev ON ev.id = e.event_id
      WHERE e.id = expense_id AND ev.host_id = auth.uid()
    )
  );

-- 참여자 SELECT
CREATE POLICY "splits_accepted_select" ON expense_splits
  FOR SELECT USING (
    participant_id IN (
      SELECT id FROM event_participants WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM expenses e
      JOIN events ev ON ev.id = e.event_id
      WHERE e.id = expense_id AND ev.host_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────
-- 9. announcement_comments 테이블 (Phase 3)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcement_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id),
  guest_name      TEXT NOT NULL CHECK (char_length(guest_name) <= 50),
  content         TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE announcement_comments ENABLE ROW LEVEL SECURITY;

-- 수락된 참여자 + 주최자 SELECT
CREATE POLICY "comments_select" ON announcement_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_id = announcement_comments.event_id
        AND user_id = auth.uid()
        AND status = 'accepted'
    )
    OR EXISTS (SELECT 1 FROM events WHERE id = announcement_comments.event_id AND host_id = auth.uid())
  );

-- 로그인 사용자 INSERT
CREATE POLICY "comments_insert" ON announcement_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 작성자 + 주최자 DELETE
CREATE POLICY "comments_delete" ON announcement_comments
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM events WHERE id = announcement_comments.event_id AND host_id = auth.uid())
  );


-- ─────────────────────────────────────────
-- 10. get_settlement_summary RPC 함수
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_settlement_summary(event_id UUID)
RETURNS TABLE (
  participant_id UUID,
  guest_name     TEXT,
  total_amount   NUMERIC,
  paid_amount    NUMERIC,
  unpaid_amount  NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    ep.id                                          AS participant_id,
    ep.guest_name,
    COALESCE(SUM(es.amount), 0)                    AS total_amount,
    COALESCE(SUM(CASE WHEN es.is_paid THEN es.amount ELSE 0 END), 0) AS paid_amount,
    COALESCE(SUM(CASE WHEN NOT es.is_paid THEN es.amount ELSE 0 END), 0) AS unpaid_amount
  FROM event_participants ep
  LEFT JOIN expense_splits es ON es.participant_id = ep.id
  WHERE ep.event_id = get_settlement_summary.event_id
    AND ep.status = 'accepted'
  GROUP BY ep.id, ep.guest_name
  ORDER BY ep.created_at;
$$;
