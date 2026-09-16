-- Apply after schema.sql. Persistent rooms, host controls, per-round results and chat.
begin;
alter table gomoku_private.rooms alter column black drop not null;
alter table gomoku_private.rooms add column if not exists host uuid references gomoku_private.people(id);
alter table gomoku_private.rooms add column if not exists round_no int not null default 0;
alter table gomoku_private.rooms add column if not exists revision bigint not null default 0;
alter table gomoku_private.rooms add column if not exists match_black uuid;
alter table gomoku_private.rooms add column if not exists match_white uuid;
alter table gomoku_private.rooms add column if not exists winner_name text;
alter table gomoku_private.rooms add column if not exists messages jsonb not null default '[]';
alter table gomoku_private.rooms add column if not exists chat_seq bigint not null default 0;
alter table gomoku_private.members add column if not exists joined timestamptz not null default now();
alter table gomoku_private.members add column if not exists last_chat timestamptz;
alter table gomoku_private.members add column if not exists last_result jsonb;
update gomoku_private.rooms set host=black where host is null and status<>'closed';

create or replace function gomoku_private.depart(rid uuid,pid uuid,why text)
returns void language plpgsql set search_path='' as $$
declare r gomoku_private.rooms%rowtype; next_host uuid;
begin
 select * into r from gomoku_private.rooms where id=rid for update;
 if not exists(select 1 from gomoku_private.members where room=rid and person=pid) then return; end if;
 if r.status='playing' and (pid=r.black or pid=r.white) then
   r.winner:=case when pid=r.black then 2 else 1 end;
   select nickname into r.winner_name from gomoku_private.people where id=case when r.winner=1 then r.black else r.white end;
   update gomoku_private.rooms set status='finished',winner=r.winner,winner_name=r.winner_name,reason=why where id=rid;
   update gomoku_private.members set last_result=jsonb_build_object('room',rid,'round',r.round_no,'result',case when person=pid then 'lose' else 'win' end,'reason',why,'winner_name',r.winner_name) where room=rid and person in (r.match_black,r.match_white);
 end if;
 delete from gomoku_private.members where room=rid and person=pid;
 update gomoku_private.rooms set black=case when black=pid then null else black end,white=case when white=pid then null else white end,revision=revision+1,updated=now() where id=rid;
 if r.host=pid then
   select person into next_host from gomoku_private.members where room=rid order by (person in (r.black,r.white)) desc nulls last,joined,person limit 1;
   update gomoku_private.rooms set host=next_host where id=rid;
 end if;
 if not exists(select 1 from gomoku_private.members where room=rid) then
   update gomoku_private.rooms set status='closed',host=null where id=rid;
 end if;
end $$;

create or replace function gomoku_private.sweep(rid uuid)
returns void language plpgsql set search_path='' as $$
declare pid uuid;
begin
 perform 1 from gomoku_private.rooms where id=rid for update;
 for pid in select person from gomoku_private.members where room=rid and seen<now()-interval '30 seconds' order by seen,person loop
   perform gomoku_private.depart(rid,pid,'상대 연결 종료');
 end loop;
 if not exists(select 1 from gomoku_private.members where room=rid) then
   update gomoku_private.rooms set status='closed',host=null,black=null,white=null,revision=revision+1 where id=rid and status<>'closed';
 end if;
end $$;
revoke all on all functions in schema gomoku_private from public,anon,authenticated;

create or replace function public.gomoku_api(p_token text,p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 me gomoku_private.people%rowtype; r gomoku_private.rooms%rowtype;
 rid uuid; other_room uuid; pw text; nick text; title_in text; role_in text; msg text; last_sent timestamptz;
 cell int; x int; y int; dx int; dy int; nx int; ny int; n int; s int; k int; color int;
 directions int[][]:=array[[1,0],[0,1],[1,1],[1,-1]];
 result jsonb; my_result text; visible_messages jsonb;
begin
 if coalesce(p_data->>'client','')<>'2' then return jsonb_build_object('error','오목이 업데이트되었습니다. 새로고침 후 다시 입장해 주세요.'); end if;
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception '세션이 올바르지 않습니다.'; end if;
 select * into me from gomoku_private.people where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for no key update;
 if p_action='hello' then
   nick:=btrim(p_data->>'nickname');
   if nick is null or char_length(nick) not between 1 and 12 then raise exception '닉네임은 1~12자로 입력해 주세요.'; end if;
   if me.id is null then
     if (select count(*) from gomoku_private.people)>50000 then raise exception '현재 입장 인원이 많습니다.'; end if;
     insert into gomoku_private.people(token_hash,nickname) values(encode(extensions.digest(p_token,'sha256'),'hex'),nick) returning * into me;
   elsif not exists(select 1 from gomoku_private.members where person=me.id) then
     update gomoku_private.people set nickname=nick where id=me.id returning * into me;
   end if;
   return jsonb_build_object('id',me.id,'nickname',me.nickname);
 end if;
 if me.id is null then raise exception '닉네임을 정하고 먼저 입장해 주세요.'; end if;
 update gomoku_private.people set seen=now() where id=me.id;
 if p_action in ('list','create') then
   for rid in select id from gomoku_private.rooms where status<>'closed' order by id limit 100 loop
     perform gomoku_private.sweep(rid);
   end loop;
 end if;
 if p_action='list' then
   select coalesce(jsonb_agg(q),'[]') into result from (
     select a.id,a.title,(a.password_hash is not null) as locked,a.status,a.moves,
       b.nickname as black_name,w.nickname as white_name,h.nickname as host_name,
       ((a.black is not null)::int+(a.white is not null)::int) as players,
       (select count(*) from gomoku_private.members m where m.room=a.id and m.person is distinct from a.black and m.person is distinct from a.white) as spectators
     from gomoku_private.rooms a left join gomoku_private.people b on b.id=a.black
       left join gomoku_private.people w on w.id=a.white left join gomoku_private.people h on h.id=a.host
     where a.status<>'closed' order by a.created desc limit 100
   ) q;
   return result;
 end if;
 if p_action='create' then
   title_in:=btrim(p_data->>'title');pw:=coalesce(p_data->>'password','');
   if title_in is null or char_length(title_in) not between 1 and 40 then raise exception '방 제목은 1~40자로 입력해 주세요.'; end if;
   if char_length(pw)>32 then raise exception '비밀번호는 32자 이하로 입력해 주세요.'; end if;
   if exists(select 1 from gomoku_private.members where person=me.id) then raise exception '기존 방을 먼저 나가 주세요.'; end if;
   if (select count(*) from gomoku_private.rooms where host=me.id and created>now()-interval '1 minute')>=3 then raise exception '방을 너무 빠르게 만들고 있습니다.'; end if;
   if (select count(*) from gomoku_private.rooms where status<>'closed')>=100 then raise exception '방이 가득 찼습니다. 기존 방에 참가해 주세요.'; end if;
   insert into gomoku_private.rooms(title,password_hash,black,host) values(title_in,case when pw='' then null else extensions.crypt(encode(extensions.digest(pw,'sha256'),'hex'),extensions.gen_salt('bf',8)) end,me.id,me.id) returning * into r;
   insert into gomoku_private.members(room,person) values(r.id,me.id);
 else
   rid:=(p_data->>'room')::uuid;
   select * into r from gomoku_private.rooms where id=rid for update;
   if r.id is null then raise exception '방을 찾을 수 없습니다.'; end if;
   if p_action='leave' then
     perform gomoku_private.depart(rid,me.id,'상대 퇴장');
     return jsonb_build_object('left',true,'outcome',case when r.status='playing' and me.id in (r.black,r.white) then jsonb_build_object('room',rid,'round',r.round_no,'result','lose','reason','대국 중 퇴장') else null end);
   end if;
   -- A valid heartbeat is refreshed before sweeping other members.
   update gomoku_private.members set seen=now() where room=rid and person=me.id;
   perform gomoku_private.sweep(rid);
   select * into r from gomoku_private.rooms where id=rid;
   if r.status='closed' then return jsonb_build_object('closed',true,'message','모든 참여자가 나가 방이 닫혔습니다.'); end if;
   if p_action='join' then
     role_in:=p_data->>'role';
     if role_in is null or role_in not in ('player','spectator') then raise exception '입장 방식이 올바르지 않습니다.'; end if;
     if not exists(select 1 from gomoku_private.members where room=rid and person=me.id) then
       if me.attempt_at<now()-interval '1 minute' then me.attempts:=0; end if;
       if me.attempts>=5 then return jsonb_build_object('error','비밀번호 시도가 많습니다. 1분 뒤 다시 시도해 주세요.'); end if;
       if r.password_hash is not null and extensions.crypt(encode(extensions.digest(coalesce(p_data->>'password',''),'sha256'),'hex'),r.password_hash)<>r.password_hash then
         update gomoku_private.people set attempts=me.attempts+1,attempt_at=case when me.attempts=0 then now() else attempt_at end where id=me.id;
         return jsonb_build_object('error','비밀번호가 맞지 않습니다.');
       end if;
       if (select count(*) from gomoku_private.members where room=rid)>=32 then raise exception '방 인원이 가득 찼습니다.'; end if;
       for other_room in select room from gomoku_private.members where person=me.id and room<>rid order by room loop
         -- No second room lock: avoid opposite-room join deadlocks.
         raise exception '기존 방을 먼저 나가 주세요.';
       end loop;
       insert into gomoku_private.members(room,person) values(rid,me.id);
     end if;
     if role_in='player' and me.id is distinct from r.black and me.id is distinct from r.white then
       if r.status='playing' or (r.black is not null and r.white is not null) then raise exception '대국 자리가 찼습니다. 관전으로 입장해 주세요.'; end if;
       if r.black is null then r.black:=me.id; else r.white:=me.id; end if;
       update gomoku_private.rooms set black=r.black,white=r.white where id=rid;
     end if;
     update gomoku_private.rooms set revision=revision+1,updated=now() where id=rid returning * into r;
   elsif not exists(select 1 from gomoku_private.members where room=rid and person=me.id) then
     return jsonb_build_object('closed',true,'message','연결이 종료되어 퇴장 처리됐습니다. 로비에서 다시 입장해 주세요.');
   end if;
   if p_action='start' then
     if r.host<>me.id then raise exception '방장만 게임을 시작할 수 있습니다.'; end if;
     if r.status='playing' then raise exception '이미 시작된 대국입니다.'; end if;
     if r.black is null or r.white is null then raise exception '두 명의 참가자가 필요합니다.'; end if;
     if coalesce((p_data->>'round')::int,-1)<>r.round_no then raise exception '대국 상태가 변경되었습니다. 다시 확인해 주세요.'; end if;
     update gomoku_private.rooms set status='playing',round_no=round_no+1,board=array_fill(0,array[225]),turn=1,moves=0,last_cell=null,winner=null,winner_name=null,reason=null,match_black=black,match_white=white,revision=revision+1,updated=now() where id=rid returning * into r;
   elsif p_action='move' then
     color:=case when me.id=r.black then 1 when me.id=r.white then 2 else 0 end;
     if r.status<>'playing' then raise exception '아직 시작하지 않았거나 종료된 대국입니다.'; end if;
     if coalesce((p_data->>'round')::int,-1)<>r.round_no then raise exception '이전 대국의 요청입니다.'; end if;
     if color=0 or color<>r.turn then raise exception '내 차례가 아닙니다.'; end if;
     cell:=(p_data->>'cell')::int;
     if cell is null or cell<0 or cell>224 then raise exception '올바르지 않은 위치입니다.'; end if;
     if r.board[cell+1]<>0 then raise exception '이미 돌이 놓인 자리입니다.'; end if;
     r.board[cell+1]:=color;r.moves:=r.moves+1;x:=cell%15;y:=cell/15;
     for k in 1..4 loop
       dx:=directions[k][1];dy:=directions[k][2];n:=1;
       foreach s in array array[-1,1] loop
         nx:=x+dx*s;ny:=y+dy*s;
         while nx between 0 and 14 and ny between 0 and 14 loop
           exit when r.board[ny*15+nx+1]<>color;
           n:=n+1;nx:=nx+dx*s;ny:=ny+dy*s;
         end loop;
       end loop;
       if n>=5 then r.status:='finished';r.winner:=color;r.winner_name:=me.nickname;r.reason:='오목 완성';exit;end if;
     end loop;
     if r.status='playing' and r.moves=225 then r.status:='finished';r.winner:=0;r.reason:='무승부';end if;
     update gomoku_private.rooms set board=r.board,moves=r.moves,last_cell=cell,turn=3-color,status=r.status,winner=r.winner,winner_name=r.winner_name,reason=r.reason,revision=revision+1,updated=now() where id=rid returning * into r;
     if r.status='finished' then
       update gomoku_private.members set last_result=jsonb_build_object('room',rid,'round',r.round_no,'result',case when r.winner=0 then 'draw' when person=me.id then 'win' else 'lose' end,'reason',r.reason,'winner_name',r.winner_name) where room=rid and person in (r.match_black,r.match_white);
     end if;
   elsif p_action='chat' then
     msg:=btrim(p_data->>'message');
     if msg is null or char_length(msg) not between 1 and 300 then raise exception '메시지는 1~300자로 입력해 주세요.'; end if;
     select last_chat into last_sent from gomoku_private.members where room=rid and person=me.id;
     if last_sent>now()-interval '1 second' then raise exception '메시지는 1초에 한 번 보낼 수 있습니다.'; end if;
     update gomoku_private.members set last_chat=now() where room=rid and person=me.id;
     r.chat_seq:=r.chat_seq+1;
     r.messages:=r.messages||jsonb_build_array(jsonb_build_object('id',r.chat_seq,'name',me.nickname,'person',me.id,'text',msg,'time',now()));
     select coalesce(jsonb_agg(value order by ord),'[]') into r.messages from jsonb_array_elements(r.messages) with ordinality t(value,ord) where ord>jsonb_array_length(r.messages)-50;
     update gomoku_private.rooms set messages=r.messages,chat_seq=r.chat_seq,revision=revision+1,updated=now() where id=rid returning * into r;
   elsif p_action not in ('join','state') then raise exception '지원하지 않는 요청입니다.';
   end if;
 end if;
 if r.status='finished' and me.id in (r.match_black,r.match_white) then
   my_result:=case when r.winner=0 then 'draw' when (r.winner=1 and me.id=r.match_black) or (r.winner=2 and me.id=r.match_white) then 'win' else 'lose' end;
 end if;
 select coalesce(jsonb_agg(value order by (value->>'id')::bigint),'[]') into visible_messages from jsonb_array_elements(r.messages) where (value->>'id')::bigint>coalesce((p_data->>'chat_since')::bigint,0);
 return jsonb_build_object('id',r.id,'title',r.title,'locked',r.password_hash is not null,'status',r.status,'board',r.board,'turn',r.turn,'moves',r.moves,'last_cell',r.last_cell,'winner',r.winner,'winner_name',r.winner_name,'reason',r.reason,
   'round',r.round_no,'revision',r.revision,'result',my_result,'is_host',r.host=me.id,'host_name',(select nickname from gomoku_private.people where id=r.host),
   'role',case when me.id=r.black then 1 when me.id=r.white then 2 else 0 end,
   'black_name',(select nickname from gomoku_private.people where id=r.black),'white_name',(select nickname from gomoku_private.people where id=r.white),
   'black_host',r.black=r.host,'white_host',r.white=r.host,
   'spectators',(select count(*) from gomoku_private.members where room=r.id and person is distinct from r.black and person is distinct from r.white),
   'messages',visible_messages,'chat_seq',r.chat_seq,'me',me.id,
   'outcome',(select last_result from gomoku_private.members where room=r.id and person=me.id));
end $$;
revoke all on function public.gomoku_api(text,text,jsonb) from public,authenticated;
grant execute on function public.gomoku_api(text,text,jsonb) to anon;
notify pgrst,'reload schema';
commit;
