import * as React from "react";
import { useParams, useLocation } from "wouter";
import { useGetPublicDepartmentInfo } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Clock, FileQuestion, GraduationCap, ArrowRight, Building2 } from "lucide-react";

export default function DeptPortal() {
  const params = useParams<{ companySlug: string; deptSlug: string }>();
  const [, setLocation] = useLocation();

  const { data, isLoading, isError } = useGetPublicDepartmentInfo(
    params.companySlug,
    params.deptSlug
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading department portal...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Portal Not Found</h1>
          <p className="text-gray-500 mt-2">This department link may be invalid or expired. Please contact your institution.</p>
        </div>
      </div>
    );
  }

  const { company, department, courses } = data as any;
  const activeCourses = courses.filter((c: any) => c.exam);
  const inactiveCourses = courses.filter((c: any) => !c.exam);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{company.name}</p>
              <h1 className="text-2xl font-bold text-gray-900">{department.name}</h1>
              {department.description && (
                <p className="text-gray-500 text-sm mt-0.5">{department.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        {courses.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No courses available in this department yet.</p>
            <p className="text-gray-400 text-sm mt-1">Please check back later or contact your administrator.</p>
          </div>
        ) : (
          <>
            {activeCourses.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-green-600" />
                  Available Exams ({activeCourses.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeCourses.map((course: any) => (
                    <Card key={course.id} className="hover:shadow-md transition-all border-green-100 hover:border-green-300">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-green-700" />
                          </div>
                          <span className="text-xs font-mono font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                            {course.code}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">{course.title}</h3>
                        {course.semester && (
                          <p className="text-xs text-gray-400 mb-3">{course.semester}</p>
                        )}
                        {course.exam && (
                          <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />{course.exam.durationMinutes} min
                            </span>
                            <span className="flex items-center gap-1">
                              <FileQuestion className="w-3.5 h-3.5" />{course.exam.questionCount} questions
                            </span>
                          </div>
                        )}
                        <Button
                          className="w-full gap-2"
                          onClick={() => setLocation(`/org/${params.companySlug}/${params.deptSlug}/${course.code.toLowerCase()}`)}
                        >
                          Take Exam <ArrowRight className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {inactiveCourses.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 opacity-60">
                  <BookOpen className="w-5 h-5" />
                  Coming Soon ({inactiveCourses.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {inactiveCourses.map((course: any) => (
                    <Card key={course.id} className="opacity-60 bg-gray-50">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 text-sm">{course.title}</p>
                          <p className="text-xs text-gray-400">{course.code}{course.semester ? ` · ${course.semester}` : ""}</p>
                        </div>
                        <span className="ml-auto text-xs text-gray-400">No exam yet</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>Powered by <span className="font-semibold">CBT Platform</span> · Secure Online Examination System</p>
          <p className="mt-1">For support, contact your department administrator</p>
        </div>
      </div>
    </div>
  );
}
