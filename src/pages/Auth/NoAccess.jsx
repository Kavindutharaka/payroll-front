import { Link } from "react-router-dom";
import { HiLockClosed, HiQuestionMarkCircle } from "react-icons/hi";
import Layout from "../../components/Layout";

/* A screen the person's role does not include, a role with no screens at all, or a bad address. */
export default function NoAccess({ none = false, missing = false }) {
  const Icon = missing ? HiQuestionMarkCircle : HiLockClosed;
  const title = missing ? "Page not found" : none ? "No screens are open to your account yet" : "You don't have access to this screen";
  const text = missing
    ? "The address may be mistyped, or the page has moved."
    : none
      ? "Your role doesn't include any part of the system yet. Ask the payroll administrator to give your role access."
      : "Your role doesn't include this part of the system. If you need it for your work, ask the payroll administrator.";
  return (
    <Layout>
      <div className="mx-auto mt-16 max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <Icon className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{text}</p>
        {!none && (
          <Link to="/" className="mt-6 inline-block rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
            Go to the start page
          </Link>
        )}
      </div>
    </Layout>
  );
}
