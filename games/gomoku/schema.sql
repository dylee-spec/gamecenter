-- PLAY LAB Gomoku. Separate from UDM scores. Public API exposes only this RPC.
begin;
create schema if not exists gomoku_private;
revoke all on schema gomoku_private from public, anon, authenticated;
create extension if not exists pgcrypto with schema extensions;
create table if not exists gomoku_private.people (
 id uuid primary key default gen_random_uuid(), token_hash text unique not null,
 nickname text not null, seen timestamptz not null default now(),
 attempts int not null default 0, attempt_at timestamptz not null default now(),
 created timestamptz not null default now()
);
create table if not exists gomoku_private.rooms (
 id uuid primary key default gen_random_uuid(), title text not null, password_hash text,
 black uuid not null references gomoku_private.people(id), white uuid references gomoku_private.people(id),
 board int[] not null default array_fill(0,array[225]), turn int not null default 1,
 status text not null default 'waiting', winner int, reason text,
 moves int not null default 0, last_cell int, created timestamptz not null default now(),
 updated timestamptz not null default now()
);
create table if not exists gomoku_private.members (
 room uuid references gomoku_private.rooms(id), person uuid references gomoku_private.people(id),
 seen timestamptz not null default now(), primary key(room,person)
);
alter table gomoku_private.people enable row level security;
alter table gomoku_private.rooms enable row level security;
alter table gomoku_private.members enable row level security;
revoke all on all tables in schema gomoku_private from public, anon, authenticated;

create or replace function public.gomoku_api(p_token text, p_action text, p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 me gomoku_private.people%rowtype; r gomoku_private.rooms%rowtype;
 rid uuid; pw text; nick text; title_in text; role_in text;
 cell int; x int; y int; dx int; dy int; nx int; ny int; n int; s int; k int; color int;
 directions int[][] := array[[1,0],[0,1],[1,1],[1,-1]];
 bseen timestamptz; wseen timestamptz; result jsonb;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception '세션이 올바르지 않습니다. 다시 입장해 주세요.'; end if;
 select * into me from gomoku_private.people where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if p_action='hello' then
   nick:=btrim(p_data->>'nickname');
   if nick is null or char_length(nick) not between 1 and 12 then raise exception '닉네임은 1~12자로 입력해 주세요.'; end if;
   if me.id is null then
     if (select count(*) from gomoku_private.people)>50000 then raise exception '현재 입장 인원이 많습니다. 나중에 다시 시도해 주세요.'; end if;
     insert into gomoku_private.people(token_hash,nickname) values(encode(extensions.digest(p_token,'sha256'),'hex'),nick) returning * into me;
   end if;
   return jsonb_build_object('id',me.id,'nickname',me.nickname);
 end if;
 if me.id is null then raise exception '닉네임을 정하고 먼저 입장해 주세요.'; end if;
 update gomoku_private.people set seen=now() where id=me.id;
 if p_action='list' then
   select coalesce(jsonb_agg(q),'[]'::jsonb) into result from (
    select a.id,a.title,(a.password_hash is not null) as locked,a.status,a.moves,
      b.nickname as black_name,w.nickname as white_name,
      (select count(*) from gomoku_private.members m where m.room=a.id and m.person<>a.black and (a.white is null or m.person<>a.white) and m.seen>now()-interval '90 seconds') as spectators
    from gomoku_private.rooms a join gomoku_private.people b on b.id=a.black
    left join gomoku_private.people w on w.id=a.white
    where a.status in ('waiting','playing') and a.created>now()-interval '6 hours'
      and exists(select 1 from gomoku_private.members m where m.room=a.id and m.person in (a.black,a.white) and m.seen>now()-interval '90 seconds')
    order by a.created desc limit 100
   ) q;
   return result;
 end if;
 if p_action='create' then
   title_in:=btrim(p_data->>'title'); pw:=coalesce(p_data->>'password','');
   if title_in is null or char_length(title_in) not between 1 and 40 then raise exception '방 제목은 1~40자로 입력해 주세요.'; end if;
   if char_length(pw)>32 then raise exception '비밀번호는 32자 이하로 입력해 주세요.'; end if;
   update gomoku_private.rooms a set status='closed',reason='참가자 연결 종료' where (a.black=me.id or a.white=me.id) and a.status in ('waiting','playing') and not exists(select 1 from gomoku_private.members m where m.room=a.id and m.person in (a.black,a.white) and m.seen>now()-interval '90 seconds');
   if exists(select 1 from gomoku_private.rooms where (black=me.id or white=me.id) and status in ('waiting','playing') and created>now()-interval '6 hours') then raise exception '기존 대기방이나 대국을 먼저 나가 주세요.'; end if;
   if (select count(*) from gomoku_private.rooms where created>now()-interval '1 minute' and black=me.id)>=3 then raise exception '방을 너무 빠르게 만들고 있습니다. 잠시 기다려 주세요.'; end if;
   if (select count(*) from gomoku_private.rooms where status in ('waiting','playing') and created>now()-interval '6 hours')>=100 then raise exception '방이 가득 찼습니다. 기존 방에 참가해 주세요.'; end if;
   insert into gomoku_private.rooms(title,password_hash,black) values(title_in,case when pw='' then null else extensions.crypt(encode(extensions.digest(pw,'sha256'),'hex'),extensions.gen_salt('bf',8)) end,me.id) returning * into r;
   insert into gomoku_private.members(room,person) values(r.id,me.id);
 else
   rid:=(p_data->>'room')::uuid;
   select * into r from gomoku_private.rooms where id=rid for update;
   if r.id is null then raise exception '방을 찾을 수 없습니다.'; end if;
   if r.created<now()-interval '6 hours' then
     update gomoku_private.rooms set status='closed',reason='방 이용 시간이 끝났습니다.' where id=r.id;
     return jsonb_build_object('closed',true,'message','방 이용 시간이 끝났습니다. 새 방을 만들어 주세요.');
   end if;
   if p_action='join' then
     if r.status='closed' then raise exception '이미 닫힌 방입니다.'; end if;
     role_in:=p_data->>'role';
     if role_in is null or role_in not in ('player','spectator') then raise exception '입장 방식이 올바르지 않습니다.'; end if;
     if not exists(select 1 from gomoku_private.members where room=r.id and person=me.id) then
       if me.attempt_at<now()-interval '1 minute' then me.attempts:=0; end if;
       if me.attempts>=5 then return jsonb_build_object('error','비밀번호 시도가 많습니다. 1분 뒤 다시 시도해 주세요.'); end if;
       if r.password_hash is not null and extensions.crypt(encode(extensions.digest(coalesce(p_data->>'password',''),'sha256'),'hex'),r.password_hash)<>r.password_hash then
         update gomoku_private.people set attempts=me.attempts+1,attempt_at=case when me.attempts=0 then now() else attempt_at end where id=me.id;
         return jsonb_build_object('error','비밀번호가 맞지 않습니다.');
       end if;
       if (select count(*) from gomoku_private.members where room=r.id and seen>now()-interval '90 seconds')>=32 then raise exception '관전 인원이 가득 찼습니다.'; end if;
     end if;
     if role_in='player' and me.id<>r.black and me.id is distinct from r.white then
       if r.status<>'waiting' or r.white is not null then raise exception '다른 사람이 먼저 참가했습니다. 관전으로 입장해 주세요.'; end if;
       if exists(select 1 from gomoku_private.rooms where id<>r.id and (black=me.id or white=me.id) and status in ('waiting','playing') and created>now()-interval '6 hours') then raise exception '다른 대국을 먼저 나가 주세요.'; end if;
       select seen into bseen from gomoku_private.members where room=r.id and person=r.black;
       if bseen<now()-interval '90 seconds' then raise exception '방장이 연결을 종료했습니다.'; end if;
       update gomoku_private.rooms set white=me.id,status='playing',updated=now() where id=r.id returning * into r;
     end if;
     insert into gomoku_private.members(room,person) values(r.id,me.id) on conflict(room,person) do update set seen=now();
   else
     if not exists(select 1 from gomoku_private.members where room=r.id and person=me.id) then raise exception '먼저 방에 입장해 주세요.'; end if;
     update gomoku_private.members set seen=now() where room=r.id and person=me.id;
   end if;
   select seen into bseen from gomoku_private.members where room=r.id and person=r.black;
   select seen into wseen from gomoku_private.members where room=r.id and person=r.white;
   if r.status='playing' and (coalesce(bseen,'epoch')<now()-interval '90 seconds' or coalesce(wseen,'epoch')<now()-interval '90 seconds') then
     update gomoku_private.rooms set status='finished',winner=case when bseen<now()-interval '90 seconds' then 2 else 1 end,reason='상대 연결 종료',updated=now() where id=r.id returning * into r;
   end if;
   if p_action='leave' then
     if me.id=r.black or me.id=r.white then
       update gomoku_private.rooms set status=case when status='waiting' then 'closed' when status='playing' then 'finished' else status end,
        winner=case when status='playing' then case when me.id=black then 2 else 1 end else winner end,
        reason=case when status='playing' then '상대 기권' else reason end,updated=now() where id=r.id;
     end if;
     delete from gomoku_private.members where room=r.id and person=me.id;
     return jsonb_build_object('left',true);
   elsif p_action='move' then
     color:=case when me.id=r.black then 1 when me.id=r.white then 2 else 0 end;
     if r.status<>'playing' then raise exception '진행 중인 대국이 아닙니다.'; end if;
     if color=0 or color<>r.turn then raise exception '내 차례가 아닙니다.'; end if;
     cell:=(p_data->>'cell')::int;
     if cell is null or cell<0 or cell>224 then raise exception '올바르지 않은 위치입니다.'; end if;
     if r.board[cell+1]<>0 then raise exception '이미 돌이 놓인 자리입니다.'; end if;
     r.board[cell+1]:=color; r.moves:=r.moves+1; r.last_cell:=cell;
     x:=cell%15; y:=cell/15;
     for k in 1..4 loop
       dx:=directions[k][1]; dy:=directions[k][2]; n:=1;
       foreach s in array array[-1,1] loop
         nx:=x+dx*s; ny:=y+dy*s;
         while nx between 0 and 14 and ny between 0 and 14 loop
           exit when r.board[ny*15+nx+1]<>color;
           n:=n+1; nx:=nx+dx*s; ny:=ny+dy*s;
         end loop;
       end loop;
       if n>=5 then r.status:='finished'; r.winner:=color; r.reason:='오목 완성'; exit; end if;
     end loop;
     if r.status='playing' and r.moves=225 then r.status:='finished'; r.winner:=0; r.reason:='무승부'; end if;
     update gomoku_private.rooms set board=r.board,moves=r.moves,last_cell=cell,turn=3-color,status=r.status,winner=r.winner,reason=r.reason,updated=now() where id=r.id returning * into r;
   elsif p_action not in ('join','state') then raise exception '지원하지 않는 요청입니다.';
   end if;
 end if;
 return jsonb_build_object('id',r.id,'title',r.title,'locked',r.password_hash is not null,'status',r.status,
  'board',r.board,'turn',r.turn,'moves',r.moves,'last_cell',r.last_cell,'winner',r.winner,'reason',r.reason,
  'role',case when me.id=r.black then 1 when me.id=r.white then 2 else 0 end,
  'black_name',(select nickname from gomoku_private.people where id=r.black),
  'white_name',(select nickname from gomoku_private.people where id=r.white),
  'black_online',exists(select 1 from gomoku_private.members where room=r.id and person=r.black and seen>now()-interval '15 seconds'),
  'white_online',exists(select 1 from gomoku_private.members where room=r.id and person=r.white and seen>now()-interval '15 seconds'),
  'spectators',(select count(*) from gomoku_private.members where room=r.id and person<>r.black and (r.white is null or person<>r.white) and seen>now()-interval '90 seconds'));
end $$;
revoke all on function public.gomoku_api(text,text,jsonb) from public;
grant execute on function public.gomoku_api(text,text,jsonb) to anon;
notify pgrst,'reload schema';
commit;
