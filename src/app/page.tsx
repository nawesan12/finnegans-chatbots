import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to Finnegans Chatbots
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Build and manage your chatbots with ease.
        </p>
        <div className="space-x-4">
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/register">Register</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
