import Link from "next/link";

const Page = () => {
  return ( <div className="flex flex-col items-center justify-center h-screen">
    <h1 className="text-3xl font-bold">PSCMS</h1>
    <p className="text-lg">Programmatic SEO Content Management System</p>
    <Link href="/dashboard" className="text-blue-500">Dashboard</Link>
    <h3 className="text-lg">put landing page here</h3>
  </div> );
}
 
export default Page;