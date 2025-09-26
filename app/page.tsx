 import { redirect } from "next/navigation";
 import { createRSCClient } from "@/lib/supabase/helpers";

 export default async function Home() {
   const supabase = await createRSCClient();
   const {
     data: { user },
   } = await supabase.auth.getUser();
   redirect(user ? "/dashboard" : "/login");
 }
