import React from "react";
import ReactDOM from "react-dom";
import { Layout, Header, Drawer, Navigation, Content, Grid, ProgressBar, Cell, Card, Button, Snackbar } from "react-mdl";

import * as view from "./view.js";
import * as network from "./network.js";
import Verify from "./Verify.js";
import Welcome from "./Welcome.js";
import MyInfo from "./MyInfo.js";
import MyClass from "./MyClass.js";
import GlobalNotification from "./GlobalNotification.js";
import MyExams from "./MyExams.js";
import Greetings from "./Greetings.js";
import QQConnection from "./QQConnection.js";
import Watched from "./Watched.js";
import Settings from "./Settings.js";
import Admin from "./Admin.js";
import About from "./About.js";
import SidebarUserInfo from "./SidebarUserInfo.js";
import Activities from "./Activities.js";
import WatchedQQGroupMessages from "./WatchedQQGroupMessages.js";
import ClassNotifications from "./ClassNotifications.js";
import AddClassNotification from "./AddClassNotification.js";
import ManualVerificationManagement from "./ManualVerificationManagement.js";
import GlobalPushManagement from "./GlobalPushManagement.js";
import AddArticle from "./AddArticle.js";
import ArticleList from "./ArticleList.js";
import ChatList from "./ChatList.js";
import ThirdPartyCards from "./ThirdPartyCards.js";
import EventHub from "./EventHub.js";
import FullScreenNotifcation from "./FullScreenNotification.js";
import Hammer from "hammerjs";
import * as logging from "./logging.js";
import * as user from "./user.js";
const config = require("./config.js");
const utils = require("./utils.js");
const qq = require("./qq.js");
const push = require("./push.js");

export default class Main extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            content: "",
            loggedIn: false,
            currentView: null,
            hideHeader: false,
            fullScreenNotifcation: "",
            isAdmin: user.info.isAdmin || false,
            snackbarActive: false,
            snackbarContent: ""
        };
        this.layoutRef = null;
        this.mainDrawerRef = null;
        this.hammer = null;
        this.lastBackButtonTime = 0;

        view.registerMain(this);
    }

    async checkUpdate() {
        let r = await network.makeRequest("POST", "/api/update/latest_version");
        r = JSON.parse(r);
        if(r.version_code > config.VERSION_CODE) {
            alert("有新版本可用。\n" + r.version_description);
        }
    }

    async waitForLogin() {
        while(true) {
            try {
                await EventHub.getDefault().waitForEvent("login_complete");
                logging.logUncaughtExceptions();
                logging.logConsoleOutputs();
                user.info.update();
                this.setState({
                    loggedIn: true
                });
                push.init();
                user.checkServiceAuth();
                view.dispatch(Watched);
                await utils.sleep(100);
                this.toggleDrawer();
            } catch(e) {
                console.log(e);
            }
        }
    }

    async handleViewDispatch() {
        while(true) {
            try {
                let params = await EventHub.getDefault().waitForEvent("view_dispatch");
                let TargetComponent = params.target;

                this.setState({
                    content: ( <TargetComponent /> ),
                    currentView: TargetComponent,
                    hideHeader: false
                });

                this.closeDrawer();

                document.getElementById("content-container").scrollTop = 0;
            } catch(e) {
                console.log(e);
            }
        }
    }

    toggleDrawer() {
        let layout = document.getElementById("main-layout");
        layout.MaterialLayout.toggleDrawer();
    }

    openDrawer() {
        let mainDrawer = document.getElementById("main-drawer");
        if(!mainDrawer.classList.contains("is-visible")) {
            this.toggleDrawer();
        }
    }

    closeDrawer() {
        let mainDrawer = document.getElementById("main-drawer");
        if(mainDrawer.classList.contains("is-visible")) {
            this.toggleDrawer();
        }
    }

    onBackButton() {
        let currentTime = Date.now();

        if(currentTime - this.lastBackButtonTime < 3000) {
            window.close();
        } else {
            this.lastBackButtonTime = currentTime;
            EventHub.getDefault().fireEvent("notification", {
                content: "再按一次返回键退出应用"
            });
        }
    }

    async handleHideHeader() {
        while(true) {
            try {
                await EventHub.getDefault().waitForEvent("hide_header");
                this.setState({
                    hideHeader: true
                });
            } catch(e) {
                console.log(e);
            }
        }
    }

    async handleNetworkError() {
        while(true) {
            try {
                await EventHub.getDefault().waitForEvent("network_error");

                let onClose;
                let closePromise = new Promise(cb => onClose = () => {
                    onClose = () => {};
                    cb();
                });

                this.setState({
                    fullScreenNotifcation: (
                        <FullScreenNotifcation text="网络错误" onClose={() => onClose()} />
                    )
                });

                EventHub.getDefault().waitForEvent("network_ok").then(() => onClose());

                await closePromise;
                this.setState({
                    fullScreenNotifcation: ""
                });
            } catch(e) {
                console.log(e);
            }
        }
    }

    async handleGeneralError() {
        while(true) {
            try {
                let details = await EventHub.getDefault().waitForEvent("error");
                console.log(details);

                this.showSnackbar("内部错误");
            } catch(e) {
                console.log(e);
            }
        }
    }

    async handleUserInfoUpdate() {
        while(true) {
            try {
                await EventHub.getDefault().waitForEvent("user_info_update");
                if(!user.info.verified) {
                    view.dispatch(Verify);
                }
                this.setState({
                    isAdmin: user.info.isAdmin
                });
            } catch(e) {
                console.log(e);
            }
        }
    }

    async handleUserLogout() {
        while(true) {
            try {
                await EventHub.getDefault().waitForEvent("logout")
                user.info.reset();
                view.dispatch(Welcome);
            } catch(e) {
                console.log(e);
            }
        }
    }

    async handleNotification() {
        while(true) {
            try {
                let details = await EventHub.getDefault().waitForEvent("notification");
                this.showSnackbar(details.content);
            } catch(e) {
                EventHub.getDefault().fireEvent("error", e);
            }
        }
    }

    showSnackbar(content) {
        this.setState({
            snackbarActive: true,
            snackbarContent: content
        });
    }

    hideSnackbar() {
        this.setState({
            snackbarActive: false,
            snackbarContent: ""
        });
    }

    onSnackbarClick() {
        this.hideSnackbar();
    }

    onSnackbarTimeout() {
        this.hideSnackbar();
    }

    initGestures() {
        this.hammer = new Hammer.Manager(document.body);
        this.hammer.add(new Hammer.Swipe({direction: Hammer.DIRECTION_HORIZONTAL}));

        this.hammer.on("swiperight", ev => {
            if(Math.abs(ev.velocity) > 1) {
                this.openDrawer();
            }
        });

        this.hammer.on("swipeleft", ev => {
            if(Math.abs(ev.velocity) > 1) {
                this.closeDrawer();
            }
        });
    }

    componentDidMount() {
        this.checkUpdate();
        this.waitForLogin();
        this.handleViewDispatch();
        this.handleHideHeader();
        this.handleNetworkError();
        this.handleGeneralError();
        this.handleUserInfoUpdate();
        this.handleUserLogout();
        this.handleNotification();
        this.initGestures();
        document.addEventListener("backbutton", () => this.onBackButton(), false);
    }

    render() {
        let nav;
        if(this.state.loggedIn) {
            nav = (
                <Navigation>
                    <NavigationItem target={MyClass} currentView={this.state.currentView} label="班级" />
                    <NavigationItem target={Watched} currentView={this.state.currentView} label="关注" />
                    <NavigationItem target={Activities} currentView={this.state.currentView} label="动态" />
                    <NavigationItem target={ChatList} currentView={this.state.currentView} label="私信" />
                    <NavigationItem target={ThirdPartyCards} currentView={this.state.currentView} label="小工具" />
                    <NavigationItem disabled={!this.state.isAdmin} target={Admin} currentView={this.state.currentView} label="管理" />
                    <NavigationItem target={About} currentView={this.state.currentView} label="关于" />
                </Navigation>
            );
        } else {
            nav = (
                <Navigation>
                </Navigation>
            );
        }

        return (
            <div>
                <Layout fixedHeader id="main-layout">
                    <Header title={
                        <span style={{marginLeft: "-10px"}}>通中云平台</span>
                    } style={{display: this.state.hideHeader ? "none" : "block"}} />
                    <Drawer id="main-drawer" style={{overflow: "hidden"}}>
                        <SidebarUserInfo />
                        {nav}
                    </Drawer>
                    <Content id="content-container">
                        <Grid>
                            <Cell col={12} align="middle" id="main-content">
                                {this.state.content}
                            </Cell>
                        </Grid>
                    </Content>
                </Layout>
                <div><Snackbar style={{zIndex: "100"}} active={this.state.snackbarActive} onClick={() => this.onSnackbarClick()} onTimeout={() => this.onSnackbarTimeout()} action="OK">{this.state.snackbarContent}</Snackbar></div>
                <div>{this.state.fullScreenNotifcation}</div>
            </div>
        );
    }
}

class NavigationItem extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        if(this.props.disabled === true) {
            return null;
        }

        let style = {};
        if(this.props.currentView == this.props.target) {
            style.color = "#3F51B5";
        }

        return (
            <a
                className="mdl-navigation__link"
                onClick={() => view.dispatch(this.props.target)}
                style={style}
            >{this.props.label}</a>
        )
    }
}
