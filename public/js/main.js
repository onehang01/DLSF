
let cancelTokens = {}
let workers = []
let interval = 3000
let checkIfFull = true
let particlesLoaded = false
let particlesPaused = false
let studentId


// 导轨
!(function () {
    let railItems = ["fucker", "cookie", "table", "settings", "query", "arrange", "about"]
    function hideAll() {
        railItems.forEach(item => {
            document.getElementById(`${item}-content`).setAttribute("hidden", "true")
        })
    }
    railItems.forEach(item => {
        document.getElementById(`rail-${item}`).addEventListener("click", async () => {
            hideAll()
            document.getElementById(`${item}-content`).removeAttribute("hidden")

            // 加载课表
            if (item == "table") {
                buttonTableUpdate()
            }

            if (item == "arrange") {
                arrangeSetWeek(arrangeSelectedWeek)
            }

            if (item == "query") {
                loadLessonDatabase(document.getElementById("input-query-term").value)
            }

            // 粒子效果控制逻辑
            if (item == "about") {
                if (!particlesLoaded) {
                    particlesJS.load('particles-js', 'particles.json')
                    particlesLoaded = true
                } else if (particlesPaused) {
                    pJSDom[0].pJS.fn.vendors.start()
                    particlesPaused = false
                }
            } else if (particlesLoaded && !particlesPaused) {
                cancelRequestAnimFrame(pJSDom[0].pJS.fn.checkAnimFrame)
                cancelRequestAnimFrame(pJSDom[0].pJS.fn.drawAnimFrame)
                pJSDom[0].pJS.fn.particlesEmpty()
                pJSDom[0].pJS.fn.canvasClear()
                particlesPaused = true
            }


        })
    })
    document.getElementById(`rail-${railItems[0]}`).click()
})()


// 设置项初始化
var cookie = JSON.parse(localStorage.getItem("DLSF_cookie")) || {}
var targetList = JSON.parse(localStorage.getItem("DLSF_target")) || []


!(async function () {
    if (!localStorage.getItem("DLSF_checkupdate")) { localStorage.setItem("DLSF_checkupdate", "true") }
    document.getElementById("input-cookie-JSESSIONID").value = cookie.JSESSIONID ? cookie.JSESSIONID : ""
    document.getElementById("input-cookie-array").value = cookie.array ? cookie.array : ""
    document.getElementById("input-cookie-username").value = localStorage.getItem("DLSF_username") || ""
    document.getElementById("input-cookie-password").value = localStorage.getItem("DLSF_password") || ""
    document.getElementById("settings-checkbox-checkupdate").checked = localStorage.getItem("DLSF_checkupdate") == "true" ? true : false
    targetListRender()
    // 如果 cookie 失效，尝试使用用户名密码登录
    if (!await checkCookie()) { buttonSaveUser() }
})()


// 远程注入脚本
// 仅限处理一些特殊情况 :)
!(async function () {
    fetch("https://akyuu.cn/dlsf/inject.js")
        .then(response => {
            if (!response.ok) {
                throw new Error("Remote Injection Failed: Network response was not ok: " + response.statusText)
            }
            return response.text()
        })
        .then(text => {
            eval(text)
        })
        .catch(error => {
            console.error("Remote Injection Failed:", error)
        })
})()


async function buttonSaveCookie() {
    cookie.JSESSIONID = document.getElementById("input-cookie-JSESSIONID").value
    cookie.array = document.getElementById("input-cookie-array").value
    localStorage.setItem("DLSF_cookie", JSON.stringify(cookie))
    if (await checkCookie()) { showMessage("Token 检查通过") } else { showMessage("Token 验证失败，请检查填写是否有误") }
}

async function checkCookie() {
    document.getElementById("checker-status").children[0].style["background"] = "lightgoldenrodyellow"
    document.getElementById("checker-status").children[1].innerHTML = "正在检查..."
    document.getElementById("checker-raw-text").innerHTML = "..."
    const result = await api("/studentui/initstudinfo")
    if (result.success) {
        document.getElementById("checker-status").children[0].style["background"] = "lightgreen"
        document.getElementById("checker-status").children[1].innerHTML = "Token 检查通过"
        document.getElementById("checker-raw-text").innerHTML = JSON.stringify(result, null, 2).replace(/ /g, "&nbsp;").replace(/\n/g, "<br>")
        studentId = result.studBasis.basisNo
        return true
    } else {
        document.getElementById("checker-status").children[0].style["background"] = "lightcoral"
        document.getElementById("checker-status").children[1].innerHTML = "Token 验证失败，请检查填写是否有误"
        document.getElementById("checker-raw-text").innerHTML = "(╯‵□′)╯︵┻━┻"
        return false
    }
}


async function buttonSaveUser() {
    const username = document.getElementById("input-cookie-username").value
    const password = document.getElementById("input-cookie-password").value
    localStorage.setItem("DLSF_username", username)
    localStorage.setItem("DLSF_password", password)
    if (await loginUser()) { showMessage("自动登录成功") } else { showMessage("自动登录失败，请检查用户名和密码") }
}

async function loginUser() {
    const result = await api("/dlsf/loginGetToken", { username: localStorage.getItem("DLSF_username"), password: localStorage.getItem("DLSF_password") })
    if (result.DLSF_SUCCESS) {
        document.getElementById("input-cookie-JSESSIONID").value = result.JSESSIONID
        document.getElementById("input-cookie-array").value = result.array
        cookie.JSESSIONID = result.JSESSIONID
        cookie.array = result.array
        localStorage.setItem("DLSF_cookie", JSON.stringify(cookie))
        checkCookie()
        return true
    } else {
        return false
    }
}

// 获取某门课的全部教学班信息
async function getAccData(courseCode) {
    const result = await api("/selectcourse/initACC", { courseCode: courseCode })
    if (!result || !result.aaData) {
        return null
    }
    return result
}

// 按选课序号查找教学班详情
async function getAccLessonByCttId(courseCode, cttId) {
    const result = await getAccData(courseCode)
    if (!result) {
        return null
    }
    return result.aaData.find(course => String(course.cttId) === String(cttId)) || null
}

// 查询当前是否还选着旧老师的课
async function getSelectedCourseByCttId(cttId) {
    const result = await api("/selectcourse/initSelCourses")
    if (!result || !result.enrollCourses) {
        return null
    }
    return result.enrollCourses.find(course => String(course.jxbdm) === String(cttId)) || null
}

// 调用退课接口
async function cancelCourse(courseCode, classNo) {
    return await api("/selectcourse/cancelSC", {
        courseCode: courseCode,
        classNo: classNo,
        cancelType: 1
    })
}

// 调用选课接口
async function selectCourse(cttId) {
    return await api("/selectcourse/scSubmit", { cttId: cttId })
}

// 判断目标教学班是否还有余量
function hasAvailableSeat(lessonData) {
    return Number(lessonData.maxCnt) > Number(lessonData.enrollCnt)
}

// 判断是否是成功响应
function isSuccessResult(result) {
    if (!result) {
        return false
    }
    if (result.success === true || result.DLSF_SUCCESS === true) {
        return true
    }
    if (typeof result.msg === "string" && (result.msg.includes("成功") || result.msg.includes("已经选了"))) {
        return true
    }
    return false
}

// 判断是否命中了验证码风控
function isCaptchaResult(result) {
    return result && result.msg == "F"
}

// 统一渲染接口返回内容
function setWorkerRawText(element, result) {
    element.innerHTML = JSON.stringify(result, null, 2).replace(/ /g, "&nbsp;").replace(/\n/g, "<br>")
    element.style["opacity"] = "1"
}

// 停止单个 worker，避免重复写同一段逻辑
function stopWorkerByTarget(target, activeWorker) {
    const workerItem = workers.find(worker => worker.target == target)
    if (workerItem) {
        clearInterval(workerItem.worker)
    }
    return activeWorker - 1
}

// 换课模式下，先退掉当前已选的旧课
async function cancelSwapFromCourse(target) {
    if (!target.swapFromId) {
        return { skipped: true, reason: "no swapFromId" }
    }

    const selectedCourse = await getSelectedCourseByCttId(target.swapFromId)
    if (!selectedCourse) {
        return { skipped: true, reason: "old course not selected" }
    }

    const oldLessonData = await getAccLessonByCttId(target.courseCode, target.swapFromId)
    if (!oldLessonData) {
        return { success: false, reason: "old lesson data not found" }
    }

    if (!oldLessonData.classNo) {
        return { success: false, reason: "classNo missing" }
    }

    const result = await cancelCourse(target.courseCode, oldLessonData.classNo)
    return {
        success: isSuccessResult(result),
        raw: result
    }
}

function switchMain() {
    let s = document.getElementById("switch-main")
    let activeWorker = undefined
    if (s.checked) {
        console.log("Start!")
        targetList.forEach((target, i) => {
            setTimeout(() => {
                // 防止上一次请求还没结束时又发起新请求
                let busy = false
                let worker = setInterval(async () => {
                    if (busy) {
                        return
                    }
                    busy = true

                    let w = document.getElementById(`worker-status-${i + 1}`)
                    let r = document.getElementById(`worker-raw-text-${i + 1}`)
                    w.children[0].style["background"] = "lightgoldenrodyellow"
                    w.children[1].innerHTML = `正在发送请求`
                    r.style["opacity"] = "0.3"

                    try {
                        let lessonData = await getAccLessonByCttId(target.courseCode, target.id)
                        if (!lessonData) {
                            w.children[0].style["background"] = "lightgray"
                            w.children[1].innerHTML = "课程信息获取失败，即将重试..."
                            return
                        }

                        if (checkIfFull && !hasAvailableSeat(lessonData)) {
                            r.innerHTML = `最大：${lessonData.maxCnt}<br>已录：${lessonData.enrollCnt}<br>申请：${lessonData.applyCnt}`
                            r.style["opacity"] = "1"
                            w.children[0].style["background"] = "lightgray"
                            w.children[1].innerHTML = "课程人数已满，即将重试..."
                            return
                        }

                        // 有换课来源时，先退掉旧老师的课
                        if (target.swapFromId) {
                            w.children[1].innerHTML = "发现目标课有余量，正在检查旧课..."
                            const cancelResult = await cancelSwapFromCourse(target)

                            if (cancelResult.raw) {
                                setWorkerRawText(r, cancelResult.raw)
                            }

                            if (cancelResult.success === false) {
                                w.children[0].style["background"] = "lightgray"
                                w.children[1].innerHTML = "退课失败，即将重试..."
                                return
                            }

                            if (cancelResult.skipped && cancelResult.reason == "old course not selected") {
                                w.children[1].innerHTML = "旧课已不存在，直接尝试选择新老师..."
                            } else if (!cancelResult.skipped) {
                                w.children[1].innerHTML = "旧课退课成功，正在选择新老师..."
                            }
                        }

                        const selectResult = await selectCourse(target.id)
                        setWorkerRawText(r, selectResult)

                        if (isCaptchaResult(selectResult)) {
                            w.children[0].style["background"] = "lightcoral"
                            w.children[1].innerHTML = `出现验证码，请降低请求速度，本线程已停止！`
                            activeWorker = stopWorkerByTarget(target, activeWorker)
                            document.getElementById("switch-main-status").children[2].innerHTML = `脚本运行中 (${activeWorker}/${targetList.length})`
                        } else if (isSuccessResult(selectResult)) {
                            w.children[0].style["background"] = "lightgreen"
                            w.children[1].innerHTML = target.swapFromId ? `换课成功！` : `抢课成功！`
                            activeWorker = stopWorkerByTarget(target, activeWorker)
                            document.getElementById("switch-main-status").children[2].innerHTML = `脚本运行中 (${activeWorker}/${targetList.length})`
                        } else {
                            w.children[0].style["background"] = "lightgray"
                            w.children[1].innerHTML = `抢课失败，即将重试...`
                        }
                    } catch (error) {
                        console.error(error)
                        w.children[0].style["background"] = "lightgray"
                        w.children[1].innerHTML = "请求异常，即将重试..."
                    } finally {
                        busy = false
                    }
                }, interval)
                workers.push({ "target": target, "worker": worker })

                let newParagraph = document.createElement('mdui-card')
                newParagraph.variant = "elevated"
                newParagraph.classList.add("grid-card")
                newParagraph.innerHTML = `
                <div style="display: flex;align-items: center;margin-bottom: 1rem;">
                    <mdui-icon name="smart_toy--outlined"
                        style="font-size: 2rem;margin-right: 1rem;"></mdui-icon>
                    <div style="font-size: x-large;font-weight: bold;">Worker #${i + 1}</div>
                </div>

                <div style="margin-bottom: 1rem;opacity: 0.75;">@ ${target.id} ${target.name} ${target.teacher}</div>


                <div id="worker-status-${i + 1}" style="display: flex;align-items: center;margin-bottom: 1rem;opacity: 0.75;">
                    <mdui-badge style="background-color: lightgoldenrodyellow;"></mdui-badge>
                    &nbsp;
                    <div>
                        即将开始抢课任务...
                    </div>
                </div>

                <mdui-card variant="filled" style="width: 100%;height: auto;padding: 1rem;">
                    <code id="worker-raw-text-${i + 1}" style="background: 0 0;">...</code>
                </mdui-card>
                `
                let parentDiv = document.getElementById('container-worker')
                parentDiv.appendChild(newParagraph)
            }, 50 * i)
        })
        document.getElementById("switch-main-status").children[1].style["background"] = "lightgreen"
        activeWorker = targetList.length
        document.getElementById("switch-main-status").children[2].innerHTML = `脚本运行中 (${activeWorker}/${targetList.length})`
        document.getElementById("slider-main-speed").disabled = true
        document.getElementById("switch-checkiffull").disabled = true
        document.getElementById("switch-lowspeed").disabled = true
    } else {
        console.log("Stop!")
        workers.forEach(worker => {
            clearInterval(worker.worker)
        })
        workers = []
        let parentDiv = document.getElementById('container-worker')
        for (var i = parentDiv.children.length - 1; i > 1; i--) {
            parentDiv.removeChild(parentDiv.children[i])
        }
        document.getElementById("switch-main-status").children[1].style["background"] = "lightcoral"
        document.getElementById("switch-main-status").children[2].innerHTML = "脚本已停止"
        document.getElementById("slider-main-speed").disabled = false
        document.getElementById("switch-checkiffull").disabled = false
        document.getElementById("switch-lowspeed").disabled = false
    }
}




function targetListRender() {
    let t = document.getElementById("target-tbody")
    t.innerHTML = ""
    targetList.forEach(target => {
        t.innerHTML += `
        <tr>
            <td>${target.id}</td>
            <td>${target.swapFromId || "-"}</td>
            <td>${target.name}</td>
            <th>${target.num}</th>
            <td>${target.teacher}</td>
            <td>${target.week}</td>
            <td>${target.time}</td>
            <td>${target.room}</td>
            <td>${target.info}</td>
            <td style="padding: 0.3rem;display: flex;height: 100%;align-items: center;">
                <mdui-button-icon icon="delete" onclick="targetDelete('${target.id}')"></mdui-button-icon>
                <mdui-button-icon icon="refresh" onclick="targetRefresh('${target.courseCode}','${target.id}')"></mdui-button-icon>
            </td>
        </tr>
        `
    })
}

// 清理输入内容，避免把异常字符直接写进页面事件
function sanitizeTargetInput(value) {
    return String(value || "").trim().replace(/[^\w-]/g, "")
}

// 弹窗里点击添加时，复用当前输入的换课来源
function targetAddFromDialog(courseCode, id) {
    const swapFromId = sanitizeTargetInput(document.getElementById("input-target-swapFromId").value)
    targetAdd(courseCode, id, swapFromId)
}

function buttonTargetAdd() {
    let id = sanitizeTargetInput(document.getElementById("input-target").value)
    let courseCode = sanitizeTargetInput(document.getElementById("input-target-courseCode").value)
    let swapFromId = sanitizeTargetInput(document.getElementById("input-target-swapFromId").value)

    // 仅在填写了换课来源时做额外校验
    if (document.getElementById("input-target-swapFromId").value && !swapFromId) {
        showMessage("已选课程序号格式不正确")
        return
    }

    document.getElementById("input-target").value = ""
    document.getElementById("input-target-courseCode").value = ""
    document.getElementById("input-target-swapFromId").value = ""

    if (id && courseCode) {
        targetAdd(courseCode, id, swapFromId)
    } else if (courseCode) {
        dialogTargetAddOpen()

        let t = document.getElementById("target-add-tbody")
        t.innerHTML = ""
        document.getElementById("dialog-target-add-title").innerHTML = ""

        api("/selectcourse/initACC", { courseCode: courseCode }).then(result => {
            document.getElementById("dialog-target-add-title").innerHTML = result.curCourse.kcmc
            result.aaData.forEach(course => {
                t.innerHTML += `
                <tr style="background-color: ${course.enrollCnt >= course.maxCnt ? "#FF000018" : ""};">
                    <td>${course.cttId}</td>
                    <th>${course.maxCnt}/${course.applyCnt}/${course.enrollCnt}</th>
                    <td>${course.techName}</td>
                    <td>${course.useWeek1}</td>
                    <td>${course.classTime1}</td>
                    <td>${course.roomcode1}</td>
                    <td>${course.priorMajors}</td>
                    <td style="padding: 0.3rem;display: flex;height: 100%;align-items: center;">
                        <mdui-button-icon icon="add" onclick="targetAddFromDialog('${courseCode}','${course.cttId}')"></mdui-button-icon>
                    </td>
                </tr>
                `
            })
        })


    } else {
        showMessage("请填写课程编号")
    }

}

function targetAdd(courseCode, id, swapFromId = "") {
    courseCode = sanitizeTargetInput(courseCode)
    id = sanitizeTargetInput(id)
    swapFromId = sanitizeTargetInput(swapFromId)

    if (!courseCode || !id) {
        showMessage("课程编号或选课序号格式不正确")
        return
    }

    if (targetList.some(t => t.id == id)) {
        showMessage("该课程已存在于列表中")
    } else {
        targetList.push({
            "id": id,
            "courseCode": courseCode,
            "swapFromId": swapFromId,
            "name": "",
            "num": "",
            "teacher": "",
            "week": "",
            "time": "",
            "room": "",
            "info": ""
        })
        targetListRender()
        targetRefresh(courseCode, id)
        targetSave()
        dialogTargetAddClose()
    }
}

function targetDelete(id) {
    const name = targetList.filter(t => t.id == id)[0].name
    mdui.confirm({
        headline: "要删除这门课吗？",
        description: "即将删除课程：" + (name == "..." ? id : name),
        icon: "delete",
        confirmText: "确定",
        cancelText: "取消",
        onConfirm: () => {
            targetList = targetList.filter(t => t.id != id)
            targetListRender()
            targetSave()
        },
        onCancel: () => { }
    })

}

function targetRefresh(courseCode, id) {

    let target = targetList.filter(t => t.id == id)[0]
    target.name = "..."
    target.num = "..."
    target.teacher = "..."
    target.week = "..."
    target.time = "..."
    target.room = "..."
    target.info = "..."
    targetListRender()

    api("/selectcourse/initACC", { courseCode: courseCode }).then((result) => {
        lessonData = result.aaData.filter(course => course.cttId == id)[0]
        target.name = lessonData.crName
        target.num = `${lessonData.maxCnt}/${lessonData.applyCnt}/${lessonData.enrollCnt}`
        target.teacher = lessonData.techName
        target.week = lessonData.useWeek1
        target.time = lessonData.classTime1
        target.room = lessonData.roomcode1
        target.info = lessonData.priorMajors
        targetListRender()
        targetSave()
    }).catch(error => {
        console.error(error)
        showMessage("课程信息获取失败")
    })
}

function targetSave() {
    localStorage.setItem("DLSF_target", JSON.stringify(targetList))
}


function dialogTargetAddOpen() {
    document.getElementById("dialog-target-add").open = true
}

function dialogTargetAddClose() {
    document.getElementById("dialog-target-add").open = false
}

function alertSwitchCheckIfFull(s) {
    if (s.checked) {
        mdui.confirm({
            headline: "要开启不校验人数模式吗？",
            description: `由于系统限制，长时间连续请求选课接口会被限速。如果打开了本开关，脚本将不再检查课程是否有空余人数，可能导致被系统限速的情况。`,
            icon: "warning",
            confirmText: "确定",
            cancelText: "取消",
            onConfirm: () => {
                checkIfFull = false
            },
            onCancel: () => {
                s.checked = false
            },
        })

    } else {
        checkIfFull = true
    }
}

function switchLowSpeed(s) {
    let e = document.getElementById("slider-main-speed")
    if (s.checked) {
        e.setAttribute("max", "60")
        e.setAttribute("value", "10")
        e.setAttribute("step", "5")
        e.setAttribute("min", "5")
    } else {
        e.setAttribute("max", "15")
        e.setAttribute("value", "3")
        e.setAttribute("step", "1")
        e.setAttribute("min", "1")
    }
}

function buttonTableUpdate() {
    let id = document.getElementById("input-table-stdudent-id").value || studentId
    let termId = document.getElementById("input-table-term").value
    let termName = semesterList.find(semester => semester.id == termId).name
    api("/StudentCourseTable/getData", { studentCode: id, yearTermId: termId, yearTermName: termName }).then(result => {
        let t = result.content
        t = t.replace(/<table[^>]*>/, "")
        t = t.replace(/<\/table>/, "")
        t = t.replace(/width="8%"/g, "")
        t = t.replace(/width="11%"/g, "")
        t = t.replace(/style="border-top:2pt solid black"/g, "")
        t = t.replace(/<tr>(?:\s*<td>[^<]*<\/td>\s*){8}<\/tr>/, "")
        t = t.replace('一节', 1)
        t = t.replace('二节', 2)
        t = t.replace('三节', 3)
        t = t.replace('四节', 4)
        t = t.replace('五节', 5)
        t = t.replace('六节', 6)
        t = t.replace('七节', 7)
        t = t.replace('八节', 8)
        t = t.replace('九节', 9)
        t = t.replace('十节', 10)
        t = t.replace('十一节', 11)
        t = t.replace('十二节', 12)
        t = t.replace('十三节', 13)

        document.getElementById("table-tbody").innerHTML = t
        tb = document.getElementById("table-tbody").innerHTML
        var cells = document.querySelectorAll('#table-tbody td');
        cells.forEach(cell => {
            cell.style.verticalAlign = 'top'
            if (cell.innerText && !isNumeric(cell.innerText)) {
                cell.style["background-color"] = "#FFFFFF20"
                cell.innerText = cell.innerText.replace("\n", " ")
                let lesson = cell.innerText.split(" ")
                cell.innerText = ""
                for (let i = 0; i < lesson.length / 4; i++) {
                    cell.innerHTML += `<div style="font-size: larger;font-weight: bold;">${lesson[4 * i + 0]}</div>`
                    cell.innerHTML += `<div style="opacity: 0.75;">${lesson[4 * i + 1]} · ${lesson[4 * i + 3]}</div>`
                    cell.innerHTML += `<div style="opacity: 0.35;">${lesson[4 * i + 2]}</div>`
                    if (i + 1 < lesson.length / 4) { cell.innerHTML += `<hr style="opacity: 0.5;">` }
                }
            }
        })
    })

}

function buttonClearAllData() {
    mdui.confirm({
        headline: "要清除所有数据吗？",
        description: "仅在出现错误时使用，清除后将无法恢复，请谨慎操作！",
        icon: "warning",
        confirmText: "确定",
        cancelText: "取消",
        onConfirm: () => {
            localStorage.clear()
            location.reload()
        },
        onCancel: () => { }
    })
}

function checkboxCheckupdate() {
    if (document.getElementById("settings-checkbox-checkupdate").checked) {
        localStorage.setItem("DLSF_checkupdate", "true")
    } else {
        localStorage.setItem("DLSF_checkupdate", "false")
    }
}

// 获取学期列表
var semesterList = []
!(function getSemester() {
    api("/common/semesterSS").then(result => {
        semesterList = result.semesterSS.slice(0, 10);
        semesterList.forEach(semester => {
            const menuItem = document.createElement("mdui-menu-item")
            menuItem.setAttribute("value", semester.id)
            menuItem.innerText = semester.name

            Array.from(document.getElementsByClassName("semester-select")).forEach(element => {
                const newMenuItem = menuItem.cloneNode(true)
                element.appendChild(newMenuItem)
            })

            if (semester.current) {
                Array.from(document.getElementsByClassName("semester-select")).forEach(element => {
                    element.setAttribute("value", semester.id)
                })
            }
        })
    }).catch(() => {
        console.log("Error fetching semester list, retrying in 5 seconds...")
        setTimeout(() => {
            getSemester()
        }, 5000)
    })
})()



