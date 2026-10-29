-- عقود — تصحيح «القانون التجاري»: هو نظام مو نوع عقد
-- 1) يشيله من أنواع العقود إذا انضاف هناك بالغلط
delete from public.contract_types
where (label like '%القانون التجاري%' or label like '%النظام التجاري%' or label like 'نظام %' or label like 'القانون %')
  and label not like 'عقد%';
-- 2) إذا كان مرفوع في مكتبة الأنظمة: يثبّت نوعه «نظام»
update public.laws set kind = 'نظام'
where (title like '%تجاري%' or title like '%التجارة%') and kind <> 'نظام';
-- 3) يعرض اللي في المكتبة عشان تتأكد
select id, title, kind, issued from public.laws order by id;
