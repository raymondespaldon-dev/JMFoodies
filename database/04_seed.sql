insert into public.food_categories(name,sort_order) values
('Appetizers',1),('Main Courses',2),('Chicken Dishes',3),('Pork Dishes',4),('Beef Dishes',5),
('Seafood',6),('Vegetables',7),('Rice',8),('Pasta',9),('Desserts',10),('Beverages',11)
on conflict(name) do nothing;

insert into public.packages(name,description,price_per_person,minimum_guests,sort_order) values
('Basic Package','A simple, satisfying spread for intimate gatherings.',280,30,1),
('Standard Package','A balanced selection for birthdays and family celebrations.',350,40,2),
('Premium Package','An elevated menu for milestone celebrations.',480,50,3),
('Deluxe Package','A generous dining experience for your special occasion.',650,60,4)
on conflict(name) do nothing;

insert into public.business_settings(key,value) values
('booking_rules','{"minimum_advance_days":3,"cancellation_policy":"Contact JMFoodies to request a cancellation."}'::jsonb),
('public_contact','{"phone":"","email":"","address":""}'::jsonb)
on conflict(key) do nothing;

-- Example dishes are seed data only. Replace or edit these through the admin menu.
insert into public.food_items(category_id,name,description,extra_price)
select c.id,v.name,v.description,v.extra_price from (values
('Chicken Dishes','Fried Chicken','Crispy crowd favorite.',0),
('Chicken Dishes','Chicken Teriyaki','Sweet-savory glazed chicken.',30),
('Pork Dishes','Pork Humba','Slow-cooked Filipino-style pork.',0),
('Seafood','Fish Fillet','Lightly breaded fish fillet.',0),
('Seafood','Garlic Butter Shrimp','Shrimp with garlic butter sauce.',80),
('Vegetables','Chopsuey','Mixed vegetables in savory sauce.',0),
('Pasta','Spaghetti','Filipino-style spaghetti.',0),
('Desserts','Leche Flan','Classic caramel custard.',0),
('Beverages','Iced Tea','House iced tea.',0)
) as v(category,name,description,extra_price)
join public.food_categories c on c.name=v.category
on conflict(category_id,name) do nothing;
